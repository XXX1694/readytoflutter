// /api/admin/* — admin dashboard endpoints. All routes are stacked behind
// requireAuth + requireAdmin so anonymous and non-admin users get 401/403
// without leaking which route they hit.
const { z } = require('zod');
const db = require('./database');
const auth = require('./auth');

function attach(app) {
  const adminGate = [auth.requireAuth, auth.requireAdmin];

  // Snapshot for the admin Overview tab.
  app.get('/api/admin/stats', adminGate, (_req, res) => {
    res.json(db.getAdminStats());
  });

  // Paginated user list with progress / last-active aggregates.
  app.get('/api/admin/users', adminGate, (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
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
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
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
