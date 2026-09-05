// Express 4 drops a rejected promise from an async handler and the request
// hangs; this shim forwards it to the error handler below.
require('express-async-errors');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const db = require('./database');
const auth = require('./auth');
const ai = require('./ai');
const admin = require('./admin');
const contact = require('./contact');
const billing = require('./billing');
const push = require('./push');
const { LIMITS } = require('./config');

db.init();

const app = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN;
const IS_PROD = process.env.NODE_ENV === 'production';

// Which X-Forwarded-For hops to trust is a fact about the deployment, not
// about NODE_ENV: trusting a hop that isn't there lets any client pick its
// own rate-limit key with one header, and trusting one hop too few keys
// every visitor on the proxy's address. TRUST_PROXY is a hop count, `false`,
// or any express `trust proxy` value. Unset in production falls back to the
// one hop Render puts in front of the service, with a warning.
const parseTrustProxy = (raw) => {
  if (raw === undefined || raw === '') return IS_PROD ? 1 : false;
  const v = raw.trim().toLowerCase();
  if (v === 'false' || v === '0') return false;
  if (v === 'true') return true;
  return /^\d+$/.test(v) ? Number(v) : raw.trim();
};
const TRUST_PROXY = parseTrustProxy(process.env.TRUST_PROXY);
if (TRUST_PROXY !== false) app.set('trust proxy', TRUST_PROXY);
if (IS_PROD && (process.env.TRUST_PROXY === undefined || process.env.TRUST_PROXY === '')) {
  console.warn('[server] TRUST_PROXY is unset; assuming one proxy hop. Set it explicitly for this deployment.');
}

// Don't advertise the framework version.
app.disable('x-powered-by');

// Security headers — helmet ships safe defaults: noSniff, X-Frame-Options
// SAMEORIGIN, X-Content-Type-Options, Cross-Origin-Resource-Policy, etc. We disable
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
if (IS_PROD && allowedOrigins.length === 0) {
  console.warn('[server] FRONTEND_ORIGIN is unset; CORS allows every origin. Set it to the site that serves the app.');
}

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
// Lightweight request id for log correlation. First, so a body-parser 400
// or 413 is logged with an id like everything else.
app.use((req, _res, next) => {
  req.id = req.headers['x-request-id'] || Math.random().toString(36).slice(2, 10);
  next();
});

// Stripe webhook needs the raw body to verify its signature. Mount the
// billing module BEFORE the JSON parser so its raw-body route wins.
billing.attach(app);

app.use(express.json({ limit: '256kb' }));

// Signed-in requests are keyed on the account, anonymous ones on the
// address: a NAT full of students shares one address, and one account
// hammering the API should not lock the others out.
const { userOrIpKey } = auth;

// Sits after requireAuth on every write route, so a burst of anonymous 401s
// cannot spend a real user's window.
const writeLimiter = rateLimit({
  windowMs: LIMITS.WRITE_WINDOW_MS,
  max: LIMITS.WRITE_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userOrIpKey,
  message: { error: 'Too many requests. Try again in a few minutes.' },
});

// Read-side limiter — protects /api/topics, /api/questions, /api/stats from
// cheap scrape loops without hurting normal browsing. A signed-in user gets
// a higher ceiling, not a bypass: registration is free and instant, so a
// bypass was one signup away from unlimited 2 MB pulls.
const readLimiter = rateLimit({
  windowMs: LIMITS.READ_WINDOW_MS,
  max: (req) => (req.user ? LIMITS.READ_MAX_AUTH : LIMITS.READ_MAX),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userOrIpKey,
  message: { error: 'Too many requests. Slow down.' },
});

// Render keeps an instance in rotation while this returns 200, so it has to
// notice the failure that matters: a database that answers but has no
// catalogue in it.
app.get('/healthz', (_req, res) => {
  try {
    const ok = db.ping();
    if (!ok) throw new Error('catalogue is empty');
    res.json({ ok: true });
  } catch (err) {
    console.error('[healthz] failed:', err?.message);
    res.status(503).json({ ok: false, error: 'database unavailable' });
  }
});

// ── Auth ─────────────────────────────────────────────────────────────────────
auth.attach(app);

// ── AI grader (Anthropic) ────────────────────────────────────────────────────
// Mounted regardless of whether ANTHROPIC_API_KEY is set — the /health
// endpoint reports `enabled: false` and the frontend hides the UI.
ai.attach(app);

// ── Web Push (daily SRS reminders) ──────────────────────────────────────────
// Same degradation as the AI grader: always mounted, /api/push/health reports
// `enabled: false` without VAPID keys and every other route answers 503.
push.attach(app);

// ── Public contact form + admin inbox (auth-gated) ──────────────────────────
contact.attach(app);
admin.attach(app);

// ── Topics (public reads — show personalized progress when authenticated) ───
// Query strings can arrive as arrays (`?level[]=x`); only a string is a filter.
const str = (value) => (typeof value === 'string' ? value : undefined);

app.get('/api/topics', auth.optionalAuth, readLimiter, (req, res) => {
  res.json(db.getTopics(str(req.query.level), req.user?.id || 0));
});

app.get('/api/topics/:slug', auth.optionalAuth, readLimiter, (req, res) => {
  const topic = db.getTopic(req.params.slug, req.user?.id || 0);
  if (!topic) return res.status(404).json({ error: 'Topic not found' });
  res.json(topic);
});

// ── Questions ────────────────────────────────────────────────────────────────
app.get('/api/questions', auth.optionalAuth, readLimiter, (req, res) => {
  const { level, difficulty, search } = req.query;
  res.json(db.getQuestions({ level: str(level), difficulty: str(difficulty), search: str(search) }, req.user?.id || 0));
});

// ── Progress (writes require auth + rate-limited) ───────────────────────────
// Define the named-action routes (/bulk, /reset) BEFORE the parametric
// /:questionId so Express doesn't capture the literal as a question id.
const ALLOWED_STATUS = new Set(['not_started', 'in_progress', 'completed']);
const { MAX_NOTES_LEN, BULK_MAX_ITEMS } = LIMITS;

app.post('/api/progress/bulk', auth.requireAuth, writeLimiter, (req, res) => {
  // A payload of the wrong shape is a client bug, and a 200 with
  // `imported: 0` would hide it — along with the import it was carrying.
  if (!Array.isArray(req.body?.items)) {
    return res.status(400).json({ error: 'items must be an array' });
  }
  const items = req.body.items;
  if (items.length > BULK_MAX_ITEMS) {
    return res.status(400).json({ error: 'Too many items in a single bulk' });
  }
  const now = Date.now();
  for (const it of items) {
    if (!ALLOWED_STATUS.has(it?.status)) {
      return res.status(400).json({ error: 'Invalid status in bulk payload' });
    }
    if (it.notes != null && typeof it.notes !== 'string') {
      return res.status(400).json({ error: 'Invalid notes in bulk payload' });
    }
    if (it.notes && it.notes.length > MAX_NOTES_LEN) {
      return res.status(400).json({ error: `Note exceeds ${MAX_NOTES_LEN} chars` });
    }
    // A client clock cannot claim the future: a stamp like "9999" would win
    // every later merge. Anything unparsable or ahead of now becomes now.
    const stamp = Date.parse(it.updated_at ?? it.updatedAt);
    it.updated_at = Number.isFinite(stamp) && stamp <= now + 60_000 ? new Date(stamp).toISOString() : new Date(now).toISOString();
    delete it.updatedAt;
  }
  const result = db.bulkSetProgress(req.user.id, items);
  res.json({ success: true, ...result });
});

app.delete('/api/progress/reset', auth.requireAuth, writeLimiter, (req, res) => {
  db.resetProgress(req.user.id);
  res.json({ success: true });
});

app.post('/api/progress/:questionId', auth.requireAuth, writeLimiter, (req, res) => {
  const { status, notes } = req.body || {};
  if (!ALLOWED_STATUS.has(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  if (notes != null && typeof notes !== 'string') {
    return res.status(400).json({ error: 'Invalid notes' });
  }
  if (notes && notes.length > MAX_NOTES_LEN) {
    return res.status(400).json({ error: `Note exceeds ${MAX_NOTES_LEN} chars` });
  }
  const qid = Number(req.params.questionId);
  if (!Number.isFinite(qid) || !db.questionExists(qid)) {
    return res.status(404).json({ error: 'Question not found' });
  }
  const result = db.setProgress(req.user.id, qid, status, notes);
  res.json({ success: true, ...result });
});

// ── SRS schedule (sync only — the browser stays the working copy) ───────────
// SM-2 state lives in localStorage: it is read synchronously on every render
// and an anonymous visitor never has an account to store it under. These two
// routes exist so a signed-in user's schedule follows them to a second device
// instead of starting from zero there.
const SRS_MAX_DUE_AHEAD_MS = LIMITS.SRS_MAX_INTERVAL_DAYS * 24 * 60 * 60 * 1000;
const inRange = (value, min, max) => {
  const n = Number(value);
  return Number.isFinite(n) && n >= min && n <= max;
};

app.get('/api/srs', auth.requireAuth, readLimiter, (req, res) => {
  const cards = db.listSrsCards(req.user.id).map((r) => ({
    questionId: r.question_id,
    stability: r.stability,
    difficulty: r.difficulty,
    interval: r.interval,
    reps: r.reps,
    dueAt: r.due_at,
    lastAt: r.last_at,
  }));
  res.json({ cards });
});

app.post('/api/srs/bulk', auth.requireAuth, writeLimiter, (req, res) => {
  // A payload of the wrong shape is a client bug; a 200 with `imported: 0`
  // would hide it along with the schedule it was carrying.
  if (!Array.isArray(req.body?.cards)) {
    return res.status(400).json({ error: 'cards must be an array' });
  }
  const cards = req.body.cards;
  if (cards.length > BULK_MAX_ITEMS) {
    return res.status(400).json({ error: 'Too many cards in a single bulk' });
  }
  const now = Date.now();
  for (const card of cards) {
    // Stability is a number of days and difficulty is FSRS's 1..10 scale.
    // Both windows are wide on purpose: they only have to exclude a broken
    // client, not second-guess the scheduler.
    if (!inRange(card?.stability, 0, LIMITS.SRS_MAX_INTERVAL_DAYS)
      || !inRange(card?.difficulty, 0, 10)
      || !inRange(card?.interval, 0, LIMITS.SRS_MAX_INTERVAL_DAYS)
      || !inRange(card?.reps, 0, 100_000)
      || !inRange(card?.lastAt ?? card?.last_at, 0, Number.MAX_SAFE_INTEGER)
      || !inRange(card?.dueAt ?? card?.due_at, 0, Number.MAX_SAFE_INTEGER)) {
      return res.status(400).json({ error: 'Invalid card in bulk payload' });
    }
    // A client clock cannot claim the future: a card "rated tomorrow" would
    // win every merge from here on. A due date ahead of now is the whole
    // point of a scheduler, so that one is only bounded against nonsense.
    card.lastAt = Math.min(Number(card.lastAt ?? card.last_at), now);
    card.dueAt = Math.min(Number(card.dueAt ?? card.due_at), now + SRS_MAX_DUE_AHEAD_MS);
  }
  const result = db.bulkSetSrsCards(req.user.id, cards);
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
  // Start the reminder timer only once the server is actually up — and only
  // here, never from push.attach(), so importing the module in a test cannot
  // leave a live interval behind.
  const pushState = push.pushState();
  const scheduled = pushState.enabled && push.startScheduler();
  console.log(`\n🚀 Server running at http://localhost:${PORT}`);
  console.log(`📚 Loaded ${stats.totalQuestions} questions from SQLite`);
  console.log(`🔐 Auth ready (JWT, ${jwtExpiry} expiry)`);
  console.log(`🛡  Hardening: helmet${IS_PROD ? ' + HSTS' : ''}, rate-limit, CORS=${FRONTEND_ORIGIN || '*'}`);
  console.log(`🤖 AI grader: ${process.env.ANTHROPIC_API_KEY ? 'enabled (Haiku 4.5)' : 'disabled (set ANTHROPIC_API_KEY to enable)'}`);
  console.log(
    `🔔 Web Push: ${pushState.enabled
      ? `enabled (daily job ${scheduled ? 'running in-process' : 'off — drive POST /api/push/run-daily from cron'})`
      : `disabled (${pushState.reason})`}\n`,
  );
});

// Graceful shutdown — flush WAL, close SQLite cleanly, give in-flight
// requests up to 10s to finish before forcing exit. Render sends SIGTERM
// on deploys; without this WAL files can be left in inconsistent states.
let shuttingDown = false;
function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n[server] ${signal} received, draining...`);
  // Stop the reminder timer first — a tick that started mid-drain would write
  // to SQLite after db.close().
  push.stopScheduler();
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
