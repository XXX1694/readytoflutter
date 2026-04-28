// Centralized constants. Keeping them here rather than scattered across
// route handlers prevents the "limit drift" you get when one place is
// updated and another isn't.

const LIMITS = Object.freeze({
  // Progress write window — bulk imports + per-question PATCHes share this.
  WRITE_WINDOW_MS: 15 * 60 * 1000,
  WRITE_MAX: 200,

  // Read-side scrape protection. Authenticated users bypass.
  READ_WINDOW_MS: 60 * 1000,
  READ_MAX: 120,

  // Auth window (consumed by auth.js for /register and /login).
  AUTH_WINDOW_MS: 15 * 60 * 1000,
  AUTH_MAX: 10,

  MAX_NOTES_LEN: 1000,
  BULK_MAX_ITEMS: 1000,
});

const SECURITY = Object.freeze({
  BCRYPT_ROUNDS: 11,
});

module.exports = { LIMITS, SECURITY };
