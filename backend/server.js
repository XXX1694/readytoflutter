const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const db = require('./database');
const auth = require('./auth');
const { LIMITS } = require('./config');

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

// CORS — FRONTEND_ORIGIN can be a single value or a comma-separated list.
// Match case-insensitively because browsers normalise the Origin header to
// lowercase, while the env var often comes in mixed case (e.g.
// 'https://XXX1694.github.io' vs the lowercased 'xxx1694.github.io' the
// browser actually sends). Empty FRONTEND_ORIGIN allows everything (dev).
const allowedOrigins = (FRONTEND_ORIGIN || '')
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins.length === 0
      ? true
      : (origin, cb) => {
          // No-origin requests (curl, server-to-server, same-origin) are fine.
          if (!origin) return cb(null, true);
          cb(null, allowedOrigins.includes(origin.toLowerCase()));
        },
    credentials: false,
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);
app.use(express.json({ limit: '256kb' }));

// Lightweight request id for log correlation.
app.use((req, _res, next) => {
  req.id = req.headers['x-request-id'] || Math.random().toString(36).slice(2, 10);
  next();
});

const writeLimiter = rateLimit({
  windowMs: LIMITS.WRITE_WINDOW_MS,
  max: LIMITS.WRITE_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Try again in a few minutes.' },
});

// Read-side limiter — protects unauthenticated /api/topics, /api/questions,
// /api/stats from cheap scrape loops without hurting normal browsing.
const readLimiter = rateLimit({
  windowMs: LIMITS.READ_WINDOW_MS,
  max: LIMITS.READ_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => !!req.user, // authenticated users bypass
  message: { error: 'Too many requests. Slow down.' },
});

app.get('/healthz', (_req, res) => {
  try {
    const ok = db.ping();
    if (!ok) throw new Error('db ping returned non-ok');
    res.json({ ok: true });
  } catch (err) {
    console.error('[healthz] db ping failed:', err?.message);
    res.status(503).json({ ok: false, error: 'database unavailable' });
  }
});

// ── Auth ─────────────────────────────────────────────────────────────────────
auth.attach(app);

// ── Topics (public reads — show personalized progress when authenticated) ───
app.get('/api/topics', auth.optionalAuth, readLimiter, (req, res) => {
  res.json(db.getTopics(req.query.level, req.user?.id || 0));
});

app.get('/api/topics/:slug', auth.optionalAuth, readLimiter, (req, res) => {
  const topic = db.getTopic(req.params.slug, req.user?.id || 0);
  if (!topic) return res.status(404).json({ error: 'Topic not found' });
  res.json(topic);
});

// ── Questions ────────────────────────────────────────────────────────────────
app.get('/api/questions', auth.optionalAuth, readLimiter, (req, res) => {
  res.json(db.getQuestions(req.query, req.user?.id || 0));
});

// ── Progress (writes require auth + rate-limited) ───────────────────────────
// Define the named-action routes (/bulk, /reset) BEFORE the parametric
// /:questionId so Express doesn't capture the literal as a question id.
const ALLOWED_STATUS = new Set(['not_started', 'in_progress', 'completed']);
const { MAX_NOTES_LEN, BULK_MAX_ITEMS } = LIMITS;

app.post('/api/progress/bulk', writeLimiter, auth.requireAuth, (req, res) => {
  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  if (items.length > BULK_MAX_ITEMS) {
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
  const qid = Number(req.params.questionId);
  if (!Number.isFinite(qid) || !db.questionExists(qid)) {
    return res.status(404).json({ error: 'Question not found' });
  }
  const result = db.setProgress(req.user.id, qid, status, notes);
  res.json({ success: true, ...result });
});

// ── Stats (per-user when authenticated) ──────────────────────────────────────
app.get('/api/stats', auth.optionalAuth, readLimiter, (req, res) => {
  res.json(db.getStats(req.user?.id || 0));
});

// 404 for unknown /api routes (skip auth/health which are mounted above)
app.use('/api', (req, res) => {
  res.status(404).json({ error: `Not found: ${req.method} ${req.originalUrl}` });
});

app.use((err, req, res, _next) => {
  console.error(
    `[server] reqId=${req.id} ${req.method} ${req.originalUrl} userId=${req.user?.id || 0}:`,
    err?.stack || err,
  );
  res.status(err.status || 500).json({ error: err.expose ? err.message : 'Internal server error' });
});

const server = app.listen(PORT, () => {
  const stats = db.getStats();
  const jwtExpiry = process.env.JWT_EXPIRES_IN || '7d';
  console.log(`\n🚀 Server running at http://localhost:${PORT}`);
  console.log(`📚 Loaded ${stats.totalQuestions} questions from SQLite`);
  console.log(`🔐 Auth ready (JWT, ${jwtExpiry} expiry)`);
  console.log(`🛡  Hardening: helmet${IS_PROD ? ' + HSTS' : ''}, rate-limit, CORS=${FRONTEND_ORIGIN || '*'}\n`);
});

// Graceful shutdown — flush WAL, close SQLite cleanly, give in-flight
// requests up to 10s to finish before forcing exit. Render sends SIGTERM
// on deploys; without this WAL files can be left in inconsistent states.
let shuttingDown = false;
function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n[server] ${signal} received, draining...`);
  const force = setTimeout(() => {
    console.warn('[server] forced exit after 10s drain');
    db.close();
    process.exit(1);
  }, 10_000);
  force.unref();
  server.close(() => {
    db.close();
    console.log('[server] shutdown clean');
    process.exit(0);
  });
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => {
  console.error('[server] unhandledRejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[server] uncaughtException:', err);
  shutdown('uncaughtException');
});
