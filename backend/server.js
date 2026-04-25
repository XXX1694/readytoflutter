const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const db = require('./database');
const auth = require('./auth');

db.init();

const app = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN;
const IS_PROD = process.env.NODE_ENV === 'production';

// Render (and most reverse proxies) terminate TLS upstream and set
// X-Forwarded-* headers. Trust them so req.secure / rate-limit IP detection
// work correctly without leaking false positives in dev.
if (IS_PROD) app.set('trust proxy', 1);

// Don't advertise the framework version.
app.disable('x-powered-by');

// Security headers — helmet ships safe defaults: noSniff, X-Frame-Options
// DENY, X-Content-Type-Options, Cross-Origin-Resource-Policy, etc. We disable
// the default CSP since this is a JSON API only (no HTML responses), and
// turn on HSTS for production HTTPS.
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    hsts: IS_PROD
      ? { maxAge: 60 * 60 * 24 * 180, includeSubDomains: true, preload: false }
      : false,
  }),
);

// CORS — when FRONTEND_ORIGIN is set, lock to that origin (production setup
// for cross-origin GitHub Pages → Render). Otherwise allow all (dev). The
// Authorization header must be explicitly allowed for cross-origin auth.
app.use(
  cors({
    origin: FRONTEND_ORIGIN || true,
    credentials: false,
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);
app.use(express.json({ limit: '256kb' }));

// General write-side rate limit — protects bulk import / progress writes from
// abuse beyond the auth-specific limit. 200 mutations per 15 min per IP.
const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Try again in a few minutes.' },
});

app.get('/healthz', (_req, res) => {
  res.json({ ok: true });
});

// ── Auth ─────────────────────────────────────────────────────────────────────
auth.attach(app);

// ── Topics (public reads — show personalized progress when authenticated) ───
app.get('/api/topics', auth.optionalAuth, (req, res) => {
  res.json(db.getTopics(req.query.level, req.user?.id || 0));
});

app.get('/api/topics/:slug', auth.optionalAuth, (req, res) => {
  const topic = db.getTopic(req.params.slug, req.user?.id || 0);
  if (!topic) return res.status(404).json({ error: 'Topic not found' });
  res.json(topic);
});

// ── Questions ────────────────────────────────────────────────────────────────
app.get('/api/questions', auth.optionalAuth, (req, res) => {
  res.json(db.getQuestions(req.query, req.user?.id || 0));
});

// ── Progress (writes require auth + rate-limited) ───────────────────────────
// Define the named-action routes (/bulk, /reset) BEFORE the parametric
// /:questionId so Express doesn't capture the literal as a question id.
const ALLOWED_STATUS = new Set(['not_started', 'in_progress', 'completed']);
const MAX_NOTES_LEN = 1000;

app.post('/api/progress/bulk', writeLimiter, auth.requireAuth, (req, res) => {
  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  if (items.length > 1000) {
    return res.status(400).json({ error: 'Too many items in a single bulk' });
  }
  for (const it of items) {
    if (!ALLOWED_STATUS.has(it?.status)) {
      return res.status(400).json({ error: 'Invalid status in bulk payload' });
    }
    if (it.notes && String(it.notes).length > MAX_NOTES_LEN) {
      return res.status(400).json({ error: `Note exceeds ${MAX_NOTES_LEN} chars` });
    }
  }
  const result = db.bulkSetProgress(req.user.id, items);
  res.json({ success: true, ...result });
});

app.delete('/api/progress/reset', writeLimiter, auth.requireAuth, (req, res) => {
  db.resetProgress(req.user.id);
  res.json({ success: true });
});

app.post('/api/progress/:questionId', writeLimiter, auth.requireAuth, (req, res) => {
  const { status, notes } = req.body || {};
  if (!ALLOWED_STATUS.has(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  if (notes && String(notes).length > MAX_NOTES_LEN) {
    return res.status(400).json({ error: `Note exceeds ${MAX_NOTES_LEN} chars` });
  }
  const result = db.setProgress(req.user.id, req.params.questionId, status, notes);
  res.json({ success: true, ...result });
});

// ── Stats (per-user when authenticated) ──────────────────────────────────────
app.get('/api/stats', auth.optionalAuth, (req, res) => {
  res.json(db.getStats(req.user?.id || 0));
});

app.use((err, _req, res, _next) => {
  console.error('[server]', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  const stats = db.getStats();
  const jwtExpiry = process.env.JWT_EXPIRES_IN || '7d';
  console.log(`\n🚀 Server running at http://localhost:${PORT}`);
  console.log(`📚 Loaded ${stats.totalQuestions} questions from SQLite`);
  console.log(`🔐 Auth ready (JWT, ${jwtExpiry} expiry)`);
  console.log(`🛡  Hardening: helmet${IS_PROD ? ' + HSTS' : ''}, rate-limit, CORS=${FRONTEND_ORIGIN || '*'}\n`);
});
