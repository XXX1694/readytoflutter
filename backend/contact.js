// Public contact form. Stores messages in SQLite and surfaces them to the
// admin inbox; no email is sent yet (Resend integration is a follow-up).
//
// Anti-spam guards:
// - per-IP rate limit (5 / day) on top of the global write limiter
// - hard length cap on the message body (config.CONTACT_MAX_MESSAGE_LEN)
// - honeypot field `website` — if a bot fills it, we 200 and discard
const { z } = require('zod');
const rateLimit = require('express-rate-limit');
const db = require('./database');
const auth = require('./auth');
const { LIMITS } = require('./config');

const contactSchema = z.object({
  name: z.string().trim().max(120).optional().nullable(),
  email: z.string().trim().toLowerCase().email({ message: 'Invalid email' }),
  message: z
    .string()
    .trim()
    .min(10, { message: 'Message too short' })
    .max(LIMITS.CONTACT_MAX_MESSAGE_LEN, { message: 'Message too long' }),
  website: z.string().optional(), // honeypot
});

const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many submissions. Try again later.' },
});

function attach(app) {
  // Public submission. optionalAuth so we can tag the message with user_id
  // when the visitor is signed in — useful for admin triage.
  app.post('/api/contact', contactLimiter, auth.optionalAuth, (req, res) => {
    const parsed = contactSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.issues[0]?.message || 'Invalid input',
      });
    }
    // Honeypot: real users never fill this. Acknowledge to look indistinguishable.
    if (parsed.data.website && parsed.data.website.trim() !== '') {
      return res.status(200).json({ ok: true });
    }
    const ip = req.ip || null;
    if (db.recentContactsByIp(ip, 24 * 3600_000) >= LIMITS.CONTACT_MAX_PER_IP_PER_DAY) {
      return res.status(429).json({ error: 'Daily limit reached. Email us directly.' });
    }
    const row = db.createContactMessage({
      userId: req.user?.id || null,
      name: parsed.data.name || req.user?.name || null,
      email: parsed.data.email || req.user?.email,
      message: parsed.data.message,
      ip,
    });
    console.log(
      `[contact] received id=${row.id} from=${row.email} userId=${row.user_id || 0}`,
    );
    res.status(201).json({ ok: true, id: row.id });
  });
}

module.exports = { attach };
