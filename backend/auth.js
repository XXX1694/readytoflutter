const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const rateLimit = require('express-rate-limit');
const db = require('./database');
const { LIMITS, SECURITY } = require('./config');

// Default 7d for production; overridable via env. Shorter expiry reduces
// the blast radius of a stolen token at the cost of asking users to sign in
// once a week.
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const BCRYPT_ROUNDS = SECURITY.BCRYPT_ROUNDS;

// Resolve the JWT secret with a stable fallback so tokens survive dev restarts.
//   1. JWT_SECRET env var — production path.
//   2. Persisted random secret at backend/data/.jwt-secret (gitignored under
//      backend/data/). Generated once on first boot.
function resolveJwtSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;

  const secretPath = path.join(__dirname, 'data', '.jwt-secret');
  try {
    if (fs.existsSync(secretPath)) {
      const cached = fs.readFileSync(secretPath, 'utf8').trim();
      if (cached) return cached;
    }
  } catch { /* fall through to generation */ }

  const generated = crypto.randomBytes(48).toString('base64url');
  try {
    fs.mkdirSync(path.dirname(secretPath), { recursive: true });
    fs.writeFileSync(secretPath, generated, { mode: 0o600 });
    console.warn('⚠️  JWT_SECRET not set — generated a random dev secret at backend/data/.jwt-secret');
  } catch (err) {
    console.warn('⚠️  Could not persist a JWT secret; using one for this process only:', err?.message);
  }
  return generated;
}

const JWT_SECRET = resolveJwtSecret();

// ── Validation schemas ───────────────────────────────────────────────────────

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email({ message: 'Invalid email address' });

const passwordSchema = z
  .string()
  .min(8, { message: 'Password must be at least 8 characters' })
  .max(200, { message: 'Password too long' })
  // Reject pure-whitespace strings — users sometimes paste spaces.
  .refine((v) => v.trim().length >= 8, { message: 'Password must be at least 8 characters' });

const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().trim().max(80).optional().nullable(),
}).refine((v) => v.password.toLowerCase() !== v.email.toLowerCase(), {
  message: 'Password cannot equal email',
  path: ['password'],
});

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, { message: 'Password required' }),
});

// ── Helpers ──────────────────────────────────────────────────────────────────

const sanitizeUser = (user) => {
  if (!user) return null;
  const { password_hash, ...rest } = user;
  return rest;
};

const signToken = (user) =>
  jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

// Read the bearer token off the Authorization header. Returns null when
// missing — callers decide whether that's a hard 401 (requireAuth) or just an
// anonymous session (optionalAuth).
const readToken = (req) => {
  const header = req.get('authorization');
  if (!header) return null;
  const m = /^Bearer\s+(.+)$/i.exec(header);
  return m ? m[1] : null;
};

// ── Middleware ───────────────────────────────────────────────────────────────

function requireAuth(req, res, next) {
  const token = readToken(req);
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = db.getUserById(payload.sub);
    if (!user) return res.status(401).json({ error: 'User no longer exists' });
    req.user = sanitizeUser(user);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function optionalAuth(req, res, next) {
  const token = readToken(req);
  if (!token) return next();
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = db.getUserById(payload.sub);
    if (user) req.user = sanitizeUser(user);
  } catch {
    // Treat invalid tokens as anonymous — the frontend will see 401 on the
    // next protected call and clear local state.
  }
  next();
}

// ── Rate limiters ────────────────────────────────────────────────────────────

const authLimiter = rateLimit({
  windowMs: LIMITS.AUTH_WINDOW_MS,
  max: LIMITS.AUTH_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many auth attempts. Try again in a few minutes.' },
});

// ── Routes ───────────────────────────────────────────────────────────────────

function attach(app) {
  // Lightweight probe so the frontend can detect whether auth is reachable
  // (used to gate the auth UI on GitHub Pages where there's no backend).
  app.get('/api/auth/health', (_req, res) => {
    res.json({ ok: true, version: 1 });
  });

  app.post('/api/auth/register', authLimiter, async (req, res) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.issues[0]?.message || 'Invalid input',
        issues: parsed.error.issues,
      });
    }
    const { email, password, name } = parsed.data;

    if (db.getUserByEmail(email)) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = db.createUser({ email, passwordHash, name });
    const token = signToken(user);
    return res.status(201).json({ user: sanitizeUser(user), token });
  });

  app.post('/api/auth/login', authLimiter, async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.issues[0]?.message || 'Invalid input',
      });
    }
    const { email, password } = parsed.data;
    const user = db.getUserByEmail(email);
    if (!user) {
      // Constant-time-ish: still hash a dummy password so timing leaks are minimal.
      await bcrypt.compare(password, '$2a$11$abcdefghijklmnopqrstuv.abcdefghijklmnopqrstuvwxy123456');
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid email or password' });

    const token = signToken(user);
    return res.json({ user: sanitizeUser(user), token });
  });

  app.post('/api/auth/logout', (_req, res) => {
    // Stateless JWT — nothing to invalidate server-side. Endpoint exists so the
    // frontend has a symmetric call and we can swap to a token blacklist later.
    res.json({ ok: true });
  });

  app.get('/api/auth/me', requireAuth, (req, res) => {
    res.json({ user: req.user });
  });

  app.put('/api/auth/me', requireAuth, (req, res) => {
    const nameSchema = z.string().trim().max(80).nullable();
    const parsed = nameSchema.safeParse(req.body?.name ?? null);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid name' });
    const updated = db.updateUserName(req.user.id, parsed.data || null);
    res.json({ user: sanitizeUser(updated) });
  });

  // Change password — requires current password as proof of identity.
  const passwordChangeSchema = z.object({
    currentPassword: z.string().min(1),
    newPassword: passwordSchema,
  });
  app.put('/api/auth/password', requireAuth, async (req, res) => {
    const parsed = passwordChangeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.issues[0]?.message || 'Invalid input',
      });
    }
    const fullUser = db.getUserById(req.user.id);
    const ok = await bcrypt.compare(parsed.data.currentPassword, fullUser.password_hash);
    if (!ok) return res.status(401).json({ error: 'Current password is incorrect' });
    if (parsed.data.currentPassword === parsed.data.newPassword) {
      return res.status(400).json({ error: 'New password must differ from current' });
    }
    if (parsed.data.newPassword.toLowerCase() === fullUser.email.toLowerCase()) {
      return res.status(400).json({ error: 'Password cannot equal email' });
    }
    const newHash = await bcrypt.hash(parsed.data.newPassword, BCRYPT_ROUNDS);
    db.updateUserPassword(req.user.id, newHash);
    res.json({ ok: true });
  });

  // Change email — also gated by current password. Re-issues the JWT so the
  // payload's `email` claim stays current.
  const emailChangeSchema = z.object({
    currentPassword: z.string().min(1),
    newEmail: emailSchema,
  });
  app.put('/api/auth/email', requireAuth, async (req, res) => {
    const parsed = emailChangeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.issues[0]?.message || 'Invalid input',
      });
    }
    const fullUser = db.getUserById(req.user.id);
    const ok = await bcrypt.compare(parsed.data.currentPassword, fullUser.password_hash);
    if (!ok) return res.status(401).json({ error: 'Current password is incorrect' });

    if (parsed.data.newEmail === fullUser.email) {
      return res.status(400).json({ error: 'New email must differ from current' });
    }
    const taken = db.getUserByEmail(parsed.data.newEmail);
    if (taken) return res.status(409).json({ error: 'Email already in use' });

    const updated = db.updateUserEmail(req.user.id, parsed.data.newEmail);
    const token = signToken(updated);
    res.json({ user: sanitizeUser(updated), token });
  });

  app.delete('/api/auth/me', requireAuth, (req, res) => {
    db.deleteUser(req.user.id);
    res.json({ ok: true });
  });
}

module.exports = {
  attach,
  requireAuth,
  optionalAuth,
};
