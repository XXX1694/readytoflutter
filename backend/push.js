// Web Push — daily "your cards are due" reminders for the SRS queue.
//
// Why Web Push and not email: the project deliberately carries no third-party
// service dependency (no OAuth provider, no mail provider — see README
// "Безопасность"). With self-generated VAPID keys the server talks straight to
// the browser vendor's push endpoint, so the only new dependency is the
// `web-push` library that signs the request. The frontend is already an
// installable PWA with a service worker, so the delivery channel exists.
//
// Degradation mirrors ai.js exactly: the module is always mounted, the library
// is required lazily so a missing npm install can't stop the server booting,
// and with no VAPID keys every endpoint answers 503 while /api/push/health
// reports { enabled: false, reason }. The frontend hides the UI off that flag.
//
// ── The due-data problem ────────────────────────────────────────────────────
//
// SRS state lives in the BROWSER, not here. `frontend/src/lib/srs.ts` keeps the
// SM-2 card map in localStorage under `rtf:srs:v1`; the server only stores
// `progress` rows (status + notes + updated_at), which say "the user marked
// this question completed" and nothing at all about when a card next comes up
// for review. So the server genuinely cannot compute "cards due today", and
// deriving it from `progress.updated_at` would be a fiction — a question
// completed 40 days ago may be due tomorrow or in six months depending on its
// ease and rep count, none of which the server has ever seen.
//
// So the client reports it. On subscribe, and on every sync afterwards
// (POST /api/push/state), the browser sends two numbers straight out of
// getSrsSummary():
//   dueCount  — cards due as of right now
//   nextDueAt — ISO timestamp of the earliest card that is NOT yet due
//
// The snapshot is stored on the SUBSCRIPTION row, not the user row, and that
// is the point: a push subscription is per-browser, localStorage is
// per-browser, so the two are one-to-one. A subscription's due snapshot is
// exactly the SRS state of the browser it will be delivered to.
//
// TRADEOFF, stated plainly:
//   * The snapshot is stale the moment the user studies somewhere the server
//     doesn't hear about. That direction is safe-ish: SM-2 cards stay due
//     until they are reviewed, so `dueCount > 0` only becomes wrong once the
//     user actually studies — and studying means opening the app, which syncs.
//   * The reverse (server thinks nothing is due when something is) just means
//     a missed reminder, never a wrong one. `nextDueAt` covers the common case:
//     the client says "nothing due now, but something comes due at T", and the
//     job wakes up on its own after T without needing another sync.
//   * A browser that never reports state is NEVER sent a daily reminder — we
//     have no evidence anything is due. Test notifications still work.
//   * A snapshot older than STALE_DAYS stops producing reminders entirely, so
//     an abandoned install is not pushed at forever.
//
// The alternative — moving SRS state server-side — is a much larger change
// that breaks the app's offline-first, works-without-an-account design. Not
// something to smuggle in behind a notifications feature.
//
// ── Scheduling ──────────────────────────────────────────────────────────────
//
// Dependency-free: one unref'd setInterval ticking every 15 minutes. Three
// guards make that safe:
//   1. Once per day per device — `last_notified_at` lives in SQLite, compared
//      against the DEVICE'S OWN local date. Persisted, so a process restart (or
//      a second tick, or an external cron hitting the trigger endpoint at the
//      same moment) re-reads the same guard and does nothing.
//   2. Quiet hours — each subscription stores the browser's UTC offset from
//      Date.prototype.getTimezoneOffset() at subscribe time, so "09:00" means
//      09:00 where the user is, not 09:00 UTC. No timezone database needed;
//      the offset is captured by the only party that knows it.
//   3. Overlap — an in-process `running` flag; ticks never interleave.
// Set PUSH_DAILY_JOB=off and drive POST /api/push/run-daily from an external
// cron instead; the SQLite guard makes both paths idempotent, so running both
// is harmless.
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');
const db = require('./database');
const auth = require('./auth');

// Lazy + tolerant of the package being missing — keeps the server bootable
// when the dependency hasn't been npm-installed yet (same as ai.js).
let webpush = null;
try {
  webpush = require('web-push');
} catch {
  webpush = null;
}

// VAPID_SUBJECT must be a mailto: or https: URI — push services use it to
// contact whoever is sending. The default keeps the feature to a two-variable
// setup, but a real deploy should set a real address.
const DEFAULT_SUBJECT = 'mailto:admin@example.com';

function envInt(name, fallback, min, max) {
  const n = Number(process.env[name]);
  if (!Number.isInteger(n) || n < min || n > max) return fallback;
  return n;
}

// Local-time window in which a reminder may be delivered. Outside it we skip
// the device entirely rather than queueing — a reminder that arrives at 03:00
// is worse than no reminder.
const SEND_HOUR_LOCAL = envInt('PUSH_SEND_HOUR', 9, 0, 23);
const QUIET_HOUR_LOCAL = envInt('PUSH_QUIET_HOUR', 22, 1, 24);
const TICK_MS = 15 * 60 * 1000;
// Devices whose SRS snapshot is older than this stop receiving reminders.
const STALE_DAYS = 30;
// Reminders are worthless once the day is over; don't let a push service hold
// one for its default (often 4 weeks) and deliver it out of nowhere.
const PUSH_TTL_SECONDS = 12 * 3600;

// ── Enablement ──────────────────────────────────────────────────────────────
// Env is read on every call (not captured at module load) so tests can flip
// the feature on and off, exactly like ai.js's buildClient().
function pushState() {
  if (!webpush) return { enabled: false, reason: 'library_missing' };
  const publicKey = (process.env.VAPID_PUBLIC_KEY || '').trim();
  const privateKey = (process.env.VAPID_PRIVATE_KEY || '').trim();
  if (!publicKey || !privateKey) return { enabled: false, reason: 'keys_missing' };
  const subject = (process.env.VAPID_SUBJECT || '').trim() || DEFAULT_SUBJECT;
  if (!/^(mailto:|https:\/\/)/.test(subject)) {
    return { enabled: false, reason: 'subject_invalid' };
  }
  // publicKey is handed to the browser by design; privateKey never leaves here.
  return { enabled: true, reason: null, publicKey, vapidDetails: { subject, publicKey, privateKey } };
}

const disabled = (res, reason) =>
  res.status(503).json({
    error: 'Push notifications are not configured on this server.',
    code: 'push_disabled',
    reason,
  });

// Endpoints and keys are per-device secrets: anyone holding an endpoint can
// push to that browser. Logs get a row id and the vendor host, never the path.
function endpointHost(endpoint) {
  try {
    return new URL(endpoint).host;
  } catch {
    return 'unknown';
  }
}

// ── Validation ──────────────────────────────────────────────────────────────

const endpointSchema = z
  .string()
  .max(2000)
  .refine((v) => v.startsWith('https://'), { message: 'endpoint must be an https URL' });

// getTimezoneOffset() spans -840 (UTC+14) to 720 (UTC-12); allow a little slack.
const tzOffsetSchema = z.number().int().min(-840).max(840);
const dueCountSchema = z.number().int().min(0).max(100000);
// ISO 8601. The client's SRS dueAt is epoch ms — send new Date(ms).toISOString().
const nextDueAtSchema = z.string().datetime().nullable();

const subscribeSchema = z.object({
  subscription: z.object({
    endpoint: endpointSchema,
    keys: z.object({
      p256dh: z.string().min(8).max(255),
      auth: z.string().min(8).max(255),
    }),
  }),
  tzOffsetMinutes: tzOffsetSchema.optional(),
  dueCount: dueCountSchema.optional(),
  nextDueAt: nextDueAtSchema.optional(),
});

const stateSchema = z.object({
  endpoint: endpointSchema,
  dueCount: dueCountSchema,
  nextDueAt: nextDueAtSchema.optional(),
  tzOffsetMinutes: tzOffsetSchema.optional(),
});

const unsubscribeSchema = z.object({ endpoint: endpointSchema });

const badInput = (res, parsed) =>
  res.status(400).json({
    error: parsed.error.issues[0]?.message || 'Invalid input',
    code: 'bad_input',
    details: parsed.error.issues,
  });

// ── Rate limiters ───────────────────────────────────────────────────────────

// Subscribe / state / unsubscribe: cheap DB writes, but a client loop
// shouldn't be able to churn them. State sync fires on app open, so this is
// deliberately roomy.
const pushLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many push requests. Try again in a few minutes.', code: 'rate_limited' },
});

// Test notifications actually hit the vendor's push service. Tight cap.
const testLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many test notifications. Try again later.', code: 'rate_limited' },
});

// The trigger endpoint fans out to every device; it is not a client feature.
const cronLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many job triggers. Try again later.', code: 'rate_limited' },
});

// ── Delivery ────────────────────────────────────────────────────────────────

// Builds the JSON the service worker receives. `kind` + `dueCount` are the
// structured half: the SW holds the i18n bundle, so it can render its own
// localized copy and ignore title/body. Those are English fallbacks for a SW
// that doesn't bother.
function buildPayload({ kind, dueCount = 0 }) {
  if (kind === 'test') {
    return {
      kind: 'test',
      title: 'Onsite — test notification',
      body: 'Notifications are working on this device.',
      tag: 'onsite-test',
      url: '/settings',
      dueCount: 0,
    };
  }
  return {
    kind: 'daily',
    title: dueCount === 1 ? '1 card is due' : `${dueCount} cards are due`,
    body: 'Your spaced-repetition queue is ready.',
    tag: 'onsite-daily', // one tag => a second reminder replaces, never stacks
    url: '/study',
    dueCount,
  };
}

/**
 * Send one notification. Never throws: a dead or misbehaving push endpoint
 * must not take down the daily job or the request that triggered it.
 *
 * A 404 or 410 from the push service is the standard "this subscription is
 * gone" signal (browser uninstalled, permission revoked, subscription
 * rotated). It is not a transient error, so the row is deleted immediately —
 * otherwise dead rows accumulate forever and every job run re-fails them.
 *
 * @returns {'sent'|'gone'|'failed'}
 */
async function deliver(sub, payload, vapidDetails) {
  try {
    await webpush.sendNotification(
      {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      },
      JSON.stringify(payload),
      { TTL: PUSH_TTL_SECONDS, vapidDetails },
    );
    return 'sent';
  } catch (err) {
    const status = err?.statusCode;
    if (status === 404 || status === 410) {
      db.deletePushSubscriptionById(sub.id);
      console.log(`[push] dropped dead subscription id=${sub.id} host=${endpointHost(sub.endpoint)} status=${status}`);
      return 'gone';
    }
    console.error(
      `[push] send failed id=${sub.id} host=${endpointHost(sub.endpoint)} status=${status || 'n/a'}:`,
      err?.message || err,
    );
    return 'failed';
  }
}

// ── The daily job ───────────────────────────────────────────────────────────

// Shift a UTC instant into the device's own local wall clock. tzOffsetMinutes
// is Date.prototype.getTimezoneOffset(): minutes to ADD to local to reach UTC,
// so UTC+3 reports -180 and local = utc - (-180 min).
function localParts(utcMs, tzOffsetMinutes) {
  const d = new Date(utcMs - tzOffsetMinutes * 60_000);
  return { hour: d.getUTCHours(), date: d.toISOString().slice(0, 10) };
}

// Is anything due for this device, as far as the server has been told?
// Either the last snapshot already had cards due, or it named a time at which
// the next card comes due and that time has passed.
function isDue(sub, nowIso) {
  if (sub.due_count > 0) return true;
  return !!sub.next_due_at && sub.next_due_at <= nowIso;
}

/**
 * One pass over every device that has reported SRS state recently.
 *
 * `now` is injectable so the tests can drive the clock instead of sleeping.
 * Returns a per-run summary; skip reasons are counted rather than logged
 * per-row so a large user base doesn't produce a log per device per tick.
 */
async function runDailyJob({ now = new Date() } = {}) {
  const state = pushState();
  if (!state.enabled) return { enabled: false, reason: state.reason };

  const nowMs = now.getTime();
  const nowIso = now.toISOString();
  const reportedSince = new Date(nowMs - STALE_DAYS * 86_400_000).toISOString();
  const candidates = db.listPushSubscriptionsForReminder({ reportedSince });

  const summary = {
    enabled: true,
    considered: candidates.length,
    sent: 0,
    gone: 0,
    failed: 0,
    skippedQuiet: 0,
    skippedToday: 0,
    skippedNothingDue: 0,
  };

  for (const sub of candidates) {
    const { hour, date } = localParts(nowMs, sub.tz_offset_minutes);

    // Quiet period, in the device's own local time.
    if (hour < SEND_HOUR_LOCAL || hour >= QUIET_HOUR_LOCAL) {
      summary.skippedQuiet += 1;
      continue;
    }

    // Once per local day. The comparison is on the device's local date, so a
    // user near midnight UTC still gets exactly one reminder per THEIR day.
    // Persisted in SQLite, which is what makes a process restart (or a cron
    // firing alongside the in-process timer) a no-op rather than a second push.
    if (sub.last_notified_at) {
      const last = localParts(Date.parse(sub.last_notified_at), sub.tz_offset_minutes);
      if (last.date === date) {
        summary.skippedToday += 1;
        continue;
      }
    }

    if (!isDue(sub, nowIso)) {
      summary.skippedNothingDue += 1;
      continue;
    }

    // due_count can be 0 while next_due_at has passed — the client told us
    // "one more comes due at T" without telling us how many. Show at least 1.
    const dueCount = Math.max(1, sub.due_count);
    const result = await deliver(sub, buildPayload({ kind: 'daily', dueCount }), state.vapidDetails);

    if (result === 'gone') {
      summary.gone += 1;
      continue;
    }
    // Marked on failure too, deliberately. Without it a device whose push
    // service is returning 500s would be retried every 15 minutes for the
    // whole send window — ~50 requests a day at a service that is already
    // unhappy. One missed reminder is the cheaper failure.
    db.markPushNotified(sub.id, nowIso);
    if (result === 'sent') summary.sent += 1;
    else summary.failed += 1;
  }

  if (summary.sent || summary.gone || summary.failed) {
    console.log(
      `[push] daily run considered=${summary.considered} sent=${summary.sent} `
        + `gone=${summary.gone} failed=${summary.failed}`,
    );
  }
  return summary;
}

// ── Scheduler ───────────────────────────────────────────────────────────────

let timer = null;
let running = false;

// Overlap guard. A run is fast, but a slow push service could in principle
// stretch one past the tick interval; two concurrent passes would race on the
// last_notified_at read and double-send.
async function tick() {
  if (running) return;
  running = true;
  try {
    await runDailyJob();
  } catch (err) {
    // A crash here would kill the interval for the life of the process.
    console.error('[push] daily job crashed:', err?.stack || err);
  } finally {
    running = false;
  }
}

// Started explicitly from server.js, not from attach(), so requiring the
// module in a test never starts a timer.
function startScheduler() {
  if (timer) return false;
  if ((process.env.PUSH_DAILY_JOB || '').trim().toLowerCase() === 'off') return false;
  timer = setInterval(tick, TICK_MS);
  timer.unref();
  // Catch up shortly after boot: a restart at 09:05 shouldn't wait for the
  // next tick. Safe to run immediately because the once-per-day guard is in
  // SQLite, so a restart loop can't produce a second push.
  const kick = setTimeout(tick, 5_000);
  kick.unref();
  return true;
}

function stopScheduler() {
  if (timer) clearInterval(timer);
  timer = null;
}

// ── Cron auth ───────────────────────────────────────────────────────────────

function safeEqual(a, b) {
  const ab = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

// Two ways in, because a cron job and a human need different credentials:
// an X-Cron-Secret header matching PUSH_CRON_SECRET (a JWT would expire on the
// cron in a week), or an admin session for a human kicking it by hand.
function requireCronOrAdmin(req, res, next) {
  const secret = (process.env.PUSH_CRON_SECRET || '').trim();
  const provided = req.get('x-cron-secret');
  if (secret && provided && safeEqual(secret, provided)) return next();
  return auth.requireAuth(req, res, () => auth.requireAdmin(req, res, next));
}

// ── Routes ──────────────────────────────────────────────────────────────────

function attach(app) {
  // Public probe, mirroring /api/ai/health. Carries the VAPID public key
  // because the browser needs it as `applicationServerKey` before it can even
  // create a subscription — that key is public by design.
  app.get('/api/push/health', auth.optionalAuth, (req, res) => {
    const state = pushState();
    const body = {
      enabled: state.enabled,
      reason: state.reason,
      publicKey: state.enabled ? state.publicKey : null,
      sendHourLocal: SEND_HOUR_LOCAL,
      quietHourLocal: QUIET_HOUR_LOCAL,
      staleDays: STALE_DAYS,
    };
    if (req.user) {
      // Never echo endpoints or keys — a device can identify itself locally
      // via registration.pushManager.getSubscription().
      body.devices = db.listPushSubscriptionsForUser(req.user.id).map((s) => ({
        id: s.id,
        created_at: s.created_at,
        last_seen_at: s.last_seen_at,
        last_notified_at: s.last_notified_at,
        state_reported_at: s.state_reported_at,
        due_count: s.due_count,
        next_due_at: s.next_due_at,
        tz_offset_minutes: s.tz_offset_minutes,
      }));
    }
    res.json(body);
  });

  app.post('/api/push/subscribe', pushLimiter, auth.requireAuth, (req, res) => {
    const state = pushState();
    if (!state.enabled) return disabled(res, state.reason);

    const parsed = subscribeSchema.safeParse(req.body);
    if (!parsed.success) return badInput(res, parsed);
    const { subscription, tzOffsetMinutes, dueCount, nextDueAt } = parsed.data;

    // Upsert on endpoint, and reassign user_id on conflict. That second half
    // matters: a push endpoint belongs to the BROWSER, so when a second person
    // signs in on a shared machine and subscribes, the row must move to them —
    // otherwise the first account keeps receiving pushes on someone else's
    // device.
    const row = db.upsertPushSubscription({
      userId: req.user.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      tzOffsetMinutes: tzOffsetMinutes ?? 0,
      dueCount,
      nextDueAt: nextDueAt ?? null,
    });
    console.log(`[push] subscribe userId=${req.user.id} id=${row.id} host=${endpointHost(subscription.endpoint)}`);
    res.status(201).json({ ok: true, device: { id: row.id, created_at: row.created_at } });
  });

  // Re-report the browser's SRS snapshot without resending the keys. Called on
  // every app open / after a study session, so the daily job's view of "what
  // is due on this device" stays close to the truth.
  //
  // This is a FULL snapshot, not a patch: `dueCount` is required, and omitting
  // `nextDueAt` means "no future card is scheduled" and clears the stored one.
  // Clients should always send both — dropping nextDueAt costs the device its
  // wake-up at T, and it will then only be reminded once dueCount goes above
  // zero and a later sync reports it.
  app.post('/api/push/state', pushLimiter, auth.requireAuth, (req, res) => {
    const state = pushState();
    if (!state.enabled) return disabled(res, state.reason);

    const parsed = stateSchema.safeParse(req.body);
    if (!parsed.success) return badInput(res, parsed);
    const { endpoint, dueCount, nextDueAt, tzOffsetMinutes } = parsed.data;

    // Scoped to the caller: holding someone else's endpoint must not let you
    // rewrite their reminder state.
    const updated = db.updatePushSubscriptionState({
      userId: req.user.id,
      endpoint,
      dueCount,
      nextDueAt: nextDueAt ?? null,
      tzOffsetMinutes,
    });
    if (!updated) {
      return res.status(404).json({ error: 'Subscription not found', code: 'not_subscribed' });
    }
    res.json({ ok: true });
  });

  app.post('/api/push/unsubscribe', pushLimiter, auth.requireAuth, (req, res) => {
    // Deliberately NOT gated on pushState(): a user turning notifications off
    // must always succeed, even if the keys were pulled from the environment
    // after they subscribed.
    const parsed = unsubscribeSchema.safeParse(req.body);
    if (!parsed.success) return badInput(res, parsed);
    const removed = db.deletePushSubscription(req.user.id, parsed.data.endpoint);
    res.json({ ok: true, removed });
  });

  // "Send me a test" — the only way a user can confirm the whole chain
  // (permission → subscription → VAPID → service worker) actually works.
  app.post('/api/push/test', testLimiter, auth.requireAuth, async (req, res) => {
    const state = pushState();
    if (!state.enabled) return disabled(res, state.reason);

    const subs = db.listPushSubscriptionsForUser(req.user.id);
    if (subs.length === 0) {
      return res.status(404).json({ error: 'No push subscriptions for this account', code: 'not_subscribed' });
    }

    const payload = buildPayload({ kind: 'test' });
    let sent = 0;
    let gone = 0;
    let failed = 0;
    // deliver() never throws, so one dead device can't 500 the request.
    for (const sub of subs) {
      const result = await deliver(sub, payload, state.vapidDetails);
      if (result === 'sent') sent += 1;
      else if (result === 'gone') gone += 1;
      else failed += 1;
    }
    if (sent === 0) {
      return res.status(502).json({ error: 'Could not deliver to any device', code: 'delivery_failed', sent, gone, failed });
    }
    res.json({ ok: true, sent, gone, failed });
  });

  // External-cron entry point. Same code path and same SQLite guard as the
  // in-process timer, so running both is harmless.
  app.post('/api/push/run-daily', cronLimiter, requireCronOrAdmin, async (req, res) => {
    const summary = await runDailyJob();
    if (!summary.enabled) return disabled(res, summary.reason);
    res.json({ ok: true, ...summary });
  });
}

module.exports = {
  attach,
  startScheduler,
  stopScheduler,
  runDailyJob,
  pushState,
};
