// Centralized constants. Keeping them here rather than scattered across
// route handlers prevents the "limit drift" you get when one place is
// updated and another isn't.

const LIMITS = Object.freeze({
  // Progress write window — bulk imports + per-question PATCHes share this.
  WRITE_WINDOW_MS: 15 * 60 * 1000,
  WRITE_MAX: 200,

  // Read-side scrape protection. A signed-in user gets a higher ceiling,
  // keyed on the account rather than the address.
  READ_WINDOW_MS: 60 * 1000,
  READ_MAX: 120,
  READ_MAX_AUTH: 600,

  // Auth window (consumed by auth.js for /register, /login and the
  // recovery reset — the anonymous, address-keyed routes).
  AUTH_WINDOW_MS: 15 * 60 * 1000,
  AUTH_MAX: 10,
  // Signed-in account changes (password, email, recovery code), keyed on
  // the account. Separate from AUTH_MAX so hammering one cannot lock login.
  ACCOUNT_WINDOW_MS: 15 * 60 * 1000,
  ACCOUNT_MAX: 10,

  MAX_NOTES_LEN: 1000,
  BULK_MAX_ITEMS: 1000,

  // Contact form: max length and a soft per-IP rate cap (5 messages / day).
  CONTACT_MAX_MESSAGE_LEN: 4000,
  CONTACT_MAX_PER_IP_PER_DAY: 5,
});

// Override-friendly tier limits. Pulled from env at boot; defaults match the
// pricing copy (free: 10/day, pro: unlimited).
const envInt = (value, fallback) => {
  if (value === undefined || value === '') return fallback;
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 ? n : fallback;
};
const TIER_LIMITS = Object.freeze({
  FREE_AI_GRADES_PER_DAY: envInt(process.env.FREE_AI_GRADES_PER_DAY, 10),
  ANON_AI_GRADES_PER_DAY: envInt(process.env.ANON_AI_GRADES_PER_DAY, 3),
});

const SECURITY = Object.freeze({
  BCRYPT_ROUNDS: 11,
});

module.exports = { LIMITS, SECURITY, TIER_LIMITS };
