// Stripe billing — creates checkout sessions for the Pro tier and processes
// subscription webhooks. The whole module is a no-op when STRIPE_SECRET_KEY
// is unset, so a fork without billing keeps booting cleanly.
//
// Endpoints:
//   POST /api/billing/checkout  — creates a Stripe Checkout Session, returns
//     { url } that the frontend redirects to. Auth required.
//   POST /api/billing/portal    — opens the Stripe customer portal so a
//     paying user can manage / cancel their subscription. Auth required.
//   POST /api/billing/webhook   — Stripe → us. Verifies signature, flips
//     users.pro_tier on subscription events. Mounted with raw body parsing.
//
// What lives in the DB after a successful subscribe:
//   users.pro_tier = 'pro'
//   users.pro_expires_at = current_period_end (ISO)
//   users.stripe_customer_id, users.stripe_subscription_id

let StripeCtor = null;
try {
  StripeCtor = require('stripe');
} catch {
  StripeCtor = null;
}

const express = require('express');
const db = require('./database');
const auth = require('./auth');

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const SUCCESS_URL = process.env.BILLING_SUCCESS_URL || 'https://example.com/?upgraded=1';
const CANCEL_URL = process.env.BILLING_CANCEL_URL || 'https://example.com/pricing';

function buildClient() {
  if (!StripeCtor || !STRIPE_SECRET_KEY) return null;
  return new StripeCtor(STRIPE_SECRET_KEY, { apiVersion: '2024-12-18.acacia' });
}

function attach(app) {
  // Public health probe so the frontend can decide whether to render the
  // upgrade button or hide it. Reports `enabled: false` (and reason) when
  // not configured — never echoes the secret itself.
  app.get('/api/billing/health', (_req, res) => {
    let reason = null;
    if (!StripeCtor) reason = 'sdk_missing';
    else if (!STRIPE_SECRET_KEY) reason = 'key_missing';
    else if (!STRIPE_PRICE_ID) reason = 'price_missing';
    res.json({ enabled: reason === null, reason });
  });

  app.post('/api/billing/checkout', auth.requireAuth, async (req, res) => {
    const stripe = buildClient();
    if (!stripe || !STRIPE_PRICE_ID) {
      return res.status(503).json({ error: 'Billing not configured', code: 'billing_unavailable' });
    }
    try {
      // Reuse a Customer if one is already attached to the user, otherwise
      // let Stripe create one on the fly via customer_email + capture the id
      // back in the webhook.
      const fullUser = db.getUserById(req.user.id);
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
        customer: fullUser.stripe_customer_id || undefined,
        customer_email: fullUser.stripe_customer_id ? undefined : fullUser.email,
        client_reference_id: String(fullUser.id),
        success_url: SUCCESS_URL,
        cancel_url: CANCEL_URL,
        allow_promotion_codes: true,
        metadata: { user_id: String(fullUser.id) },
      });
      res.json({ url: session.url });
    } catch (err) {
      console.error('[billing] checkout error:', err?.message || err);
      res.status(502).json({ error: 'Could not start checkout' });
    }
  });

  app.post('/api/billing/portal', auth.requireAuth, async (req, res) => {
    const stripe = buildClient();
    if (!stripe) return res.status(503).json({ error: 'Billing not configured' });
    const fullUser = db.getUserById(req.user.id);
    if (!fullUser.stripe_customer_id) {
      return res.status(400).json({ error: 'No active subscription' });
    }
    try {
      const portal = await stripe.billingPortal.sessions.create({
        customer: fullUser.stripe_customer_id,
        return_url: CANCEL_URL,
      });
      res.json({ url: portal.url });
    } catch (err) {
      console.error('[billing] portal error:', err?.message || err);
      res.status(502).json({ error: 'Could not open billing portal' });
    }
  });

  // Webhook needs the RAW body to verify the signature, so it gets its own
  // express.raw() parser that runs BEFORE the JSON middleware in server.js.
  app.post(
    '/api/billing/webhook',
    express.raw({ type: 'application/json', limit: '512kb' }),
    async (req, res) => {
      const stripe = buildClient();
      if (!stripe || !STRIPE_WEBHOOK_SECRET) {
        return res.status(503).end();
      }
      const sig = req.headers['stripe-signature'];
      let event;
      try {
        event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
      } catch (err) {
        console.warn('[billing] webhook signature failed:', err?.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }
      try {
        await handleEvent(stripe, event);
        res.json({ received: true });
      } catch (err) {
        console.error('[billing] webhook handler error:', err?.message || err);
        res.status(500).send('Webhook handler failed');
      }
    },
  );
}

async function handleEvent(stripe, event) {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const userId = Number(session.client_reference_id || session.metadata?.user_id);
      if (!userId) {
        console.warn('[billing] checkout.session.completed without user_id:', session.id);
        return;
      }
      const customerId = session.customer;
      const subId = session.subscription;
      let expiresAt = null;
      if (subId) {
        const sub = await stripe.subscriptions.retrieve(subId);
        expiresAt = sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null;
      }
      db.setUserProTier(userId, {
        tier: 'pro',
        expiresAt,
        stripeCustomerId: customerId,
        stripeSubscriptionId: subId,
      });
      console.log(`[billing] activated pro for userId=${userId}`);
      return;
    }
    case 'customer.subscription.updated': {
      const sub = event.data.object;
      const user = db.getUserByStripeCustomerId(sub.customer);
      if (!user) return;
      const expiresAt = sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null;
      const tier = sub.status === 'active' || sub.status === 'trialing' ? 'pro' : 'free';
      db.setUserProTier(user.id, { tier, expiresAt, stripeSubscriptionId: sub.id });
      return;
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object;
      const user = db.getUserByStripeCustomerId(sub.customer);
      if (!user) return;
      db.setUserProTier(user.id, { tier: 'free', expiresAt: null, stripeSubscriptionId: null });
      console.log(`[billing] downgraded userId=${user.id} after cancellation`);
      return;
    }
    default:
      // Fan-out events we don't currently care about. Leaving the switch
      // exhaustive lets us light up new handlers without missing the events.
      return;
  }
}

module.exports = { attach };
