// /api/admin/* — admin dashboard endpoints. All routes are stacked behind
// requireAuth + requireAdmin so anonymous and non-admin users get 401/403
// without leaking which route they hit.
const { z } = require('zod');
const db = require('./database');
const auth = require('./auth');

// Past this the page is empty anyway; keeps the bound parameter an integer.
const MAX_OFFSET = 1_000_000_000;

function attach(app) {
  const adminGate = [auth.requireAuth, auth.requireAdmin];

  // Whole numbers only: SQLite's LIMIT/OFFSET reject `1.5` and `1e999`, and
  // an offset past 2^53 stops being an integer in JavaScript at all.
  const page = (query) => {
    const limit = Math.trunc(Number(query.limit));
    const offset = Math.trunc(Number(query.offset));
    return {
      limit: Number.isFinite(limit) ? Math.max(1, Math.min(limit, 200)) : 50,
      offset: Number.isFinite(offset) ? Math.min(Math.max(offset, 0), MAX_OFFSET) : 0,
    };
  };

  // Snapshot for the admin Overview tab.
  app.get('/api/admin/stats', adminGate, (_req, res) => {
    res.json(db.getAdminStats());
  });

  // Paginated user list with progress / last-active aggregates.
  app.get('/api/admin/users', adminGate, (req, res) => {
    const { limit, offset } = page(req.query);
    const search = String(req.query.q || '').trim();
    res.json(db.listUsers({ limit, offset, search }));
  });

  // Promote / demote a user. The actor cannot demote themselves to avoid an
  // accidental "I just locked myself out of admin" situation.
  const patchUserSchema = z
    .object({
      isAdmin: z.boolean().optional(),
      proTier: z.enum(['free', 'pro', 'lifetime']).optional(),
      proExpiresAt: z.string().optional().nullable(),
    })
    .refine((v) => v.isAdmin !== undefined || v.proTier !== undefined, {
      message: 'Provide isAdmin or proTier',
    });

  app.patch('/api/admin/users/:id', adminGate, (req, res) => {
    const targetId = Number(req.params.id);
    if (!Number.isFinite(targetId) || !db.getUserById(targetId)) {
      return res.status(404).json({ error: 'User not found' });
    }
    const parsed = patchUserSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid input' });
    }
    const { isAdmin, proTier, proExpiresAt } = parsed.data;
    if (isAdmin === false && targetId === req.user.id) {
      return res.status(400).json({ error: 'Cannot demote yourself' });
    }
    let user = db.getUserById(targetId);
    if (isAdmin !== undefined) user = db.setUserAdmin(targetId, isAdmin);
    if (proTier !== undefined) {
      user = db.setUserProTier(targetId, {
        tier: proTier,
        expiresAt: proExpiresAt ?? null,
      });
    }
    res.json({ user: auth.sanitizeUser(user) });
  });

  // Contact inbox.
  app.get('/api/admin/contact', adminGate, (req, res) => {
    const status = req.query.status === 'resolved' ? 'resolved' : (req.query.status === 'open' ? 'open' : null);
    const { limit, offset } = page(req.query);
    res.json(db.listContactMessages({ status, limit, offset }));
  });

  const patchContactSchema = z.object({
    status: z.enum(['open', 'resolved']),
  });

  app.patch('/api/admin/contact/:id', adminGate, (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || !db.getContactMessage(id)) {
      return res.status(404).json({ error: 'Message not found' });
    }
    const parsed = patchContactSchema.safeParse(req.body || {});
    if (!parsed.success) return res.status(400).json({ error: 'Invalid status' });
    const updated = db.setContactStatus(id, parsed.data.status);
    res.json({ message: updated });
  });
}

module.exports = { attach };
