'use strict';

// Tests for backend/auth.js — the register / login / change-password routes.
//
// These are the boundaries where a regression either locks a real user out or
// lets someone else in, and neither shows up in the UI until it is too late.
// Each test names the specific failure it prevents.
//
// Isolation: ONSITE_DATA_DIR points database.js at a throwaway SQLite file,
// and JWT_SECRET is pinned so auth.js never writes backend/data/.jwt-secret.
//
// The auth routes are rate limited per IP (10 attempts / 15 min, one shared
// limiter instance for the whole module), so the test app trusts one proxy hop
// and each request carries its own X-Forwarded-For. Without that the suite
// would start 429-ing partway through and the failures would look like auth
// bugs.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'onsite-auth-test-'));
fs.cpSync(path.join(__dirname, 'data', 'seed'), path.join(tmpDir, 'seed'), { recursive: true });

process.env.ONSITE_DATA_DIR = tmpDir;
process.env.JWT_SECRET = 'test-secret-for-auth-tests-only-not-a-real-secret';
delete process.env.ADMIN_BOOTSTRAP_EMAIL;

const express = require('express');
const db = require('./database');
const auth = require('./auth');

db.init();

const app = express();
// One hop, so req.ip comes from X-Forwarded-For and each test gets its own
// rate-limit bucket.
app.set('trust proxy', 1);
app.use(express.json());
auth.attach(app);

let server;
let baseUrl;

test.before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  // Belt and braces: an unref'd listener can never hold the test process open
  // if the `after` hook doesn't get to run.
  server.unref();
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
  db.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// Distinct source IP per call keeps every test under the shared auth limiter.
let ipSeq = 0;
const nextIp = () => `10.0.${Math.floor(ipSeq / 250)}.${(ipSeq++ % 250) + 1}`;

const call = async (method, route, { body, token, ip } = {}) => {
  const headers = { 'X-Forwarded-For': ip || nextIp() };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${baseUrl}${route}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* non-JSON body */ }
  return { status: res.status, body: json, raw: text };
};

let emailSeq = 0;
const uniqueEmail = () => `auth-${Date.now()}-${emailSeq++}@example.test`;

// Register a user and return { email, password, token, user }.
const register = async (overrides = {}) => {
  const email = overrides.email || uniqueEmail();
  const password = overrides.password || 'correct-horse-battery';
  const res = await call('POST', '/api/auth/register', {
    body: { email, password, name: overrides.name ?? null },
  });
  assert.equal(res.status, 201, `fixture registration failed: ${res.raw}`);
  return { email, password, token: res.body.token, user: res.body.user };
};

// ── Register validation ──────────────────────────────────────────────────────

test('register rejects a password shorter than 8 characters', async () => {
  // A weak-password gate that silently loosens is invisible until an account
  // is taken over.
  const res = await call('POST', '/api/auth/register', {
    body: { email: uniqueEmail(), password: 'short7!', name: null },
  });

  assert.equal(res.status, 400);
  assert.match(res.body.error, /at least 8 characters/i);
});

test('register rejects a whitespace-only password that is long enough to pass a naive length check', async () => {
  // '        ' is 8 chars: a plain .min(8) would accept it and hash a
  // password no user could ever deliberately retype.
  const res = await call('POST', '/api/auth/register', {
    body: { email: uniqueEmail(), password: '            ', name: null },
  });

  assert.equal(res.status, 400);
  assert.match(res.body.error, /at least 8 characters/i);
});

test('register rejects a password equal to the email address', async () => {
  const email = uniqueEmail();
  const res = await call('POST', '/api/auth/register', {
    body: { email, password: email, name: null },
  });

  assert.equal(res.status, 400);
  assert.match(res.body.error, /cannot equal email/i);
});

test('register rejects the password/email match case-insensitively', async () => {
  // Email is lower-cased by the schema; comparing the raw strings would let
  // "USER@Example.test" through as a password for user@example.test.
  const email = uniqueEmail();
  const res = await call('POST', '/api/auth/register', {
    body: { email, password: email.toUpperCase(), name: null },
  });

  assert.equal(res.status, 400);
  assert.match(res.body.error, /cannot equal email/i);
});

test('register rejects a malformed email address', async () => {
  const res = await call('POST', '/api/auth/register', {
    body: { email: 'not-an-email', password: 'correct-horse-battery', name: null },
  });

  assert.equal(res.status, 400);
  assert.match(res.body.error, /invalid email/i);
});

test('register never returns the password hash to the client', async () => {
  const res = await call('POST', '/api/auth/register', {
    body: { email: uniqueEmail(), password: 'correct-horse-battery', name: 'Ada' },
  });

  assert.equal(res.status, 201);
  assert.equal(res.body.user.password_hash, undefined);
  assert.equal(res.body.user.stripe_customer_id, undefined);
  assert.equal(res.body.user.stripe_subscription_id, undefined);
  assert.ok(res.body.token, 'a session token should be issued on register');
  assert.equal(res.body.user.name, 'Ada');
});

test('register refuses a duplicate email instead of creating a second account', async () => {
  // Two rows for one email would make login non-deterministic.
  const { email } = await register();

  const res = await call('POST', '/api/auth/register', {
    body: { email, password: 'a-different-password', name: null },
  });

  assert.equal(res.status, 409);
  assert.match(res.body.error, /already registered/i);
});

test('register normalises the email so a differently-cased duplicate is still rejected', async () => {
  const { email } = await register();

  const res = await call('POST', '/api/auth/register', {
    body: { email: email.toUpperCase(), password: 'a-different-password', name: null },
  });

  assert.equal(res.status, 409);
});

// ── Login ────────────────────────────────────────────────────────────────────

test('login with a wrong password is rejected and issues no token', async () => {
  const { email } = await register();

  const res = await call('POST', '/api/auth/login', {
    body: { email, password: 'definitely-the-wrong-password' },
  });

  assert.equal(res.status, 401);
  assert.equal(res.body.token, undefined);
  assert.match(res.body.error, /invalid email or password/i);
});

test('login with an unknown email is rejected with the same message as a wrong password', async () => {
  // Distinct wording would turn the login form into an account-enumeration
  // oracle.
  const { email } = await register();

  const unknown = await call('POST', '/api/auth/login', {
    body: { email: uniqueEmail(), password: 'correct-horse-battery' },
  });
  const wrongPassword = await call('POST', '/api/auth/login', {
    body: { email, password: 'not-the-password' },
  });

  assert.equal(unknown.status, 401);
  assert.equal(unknown.body.token, undefined);
  assert.equal(unknown.body.error, wrongPassword.body.error);
});

test('login succeeds with the right password and returns a token that /auth/me accepts', async () => {
  const { email, password } = await register({ name: 'Grace' });

  const login = await call('POST', '/api/auth/login', { body: { email, password } });
  assert.equal(login.status, 200);
  assert.ok(login.body.token);
  assert.equal(login.body.user.email, email);
  assert.equal(login.body.user.password_hash, undefined);

  const me = await call('GET', '/api/auth/me', { token: login.body.token });
  assert.equal(me.status, 200);
  assert.equal(me.body.user.email, email);
  assert.equal(me.body.user.name, 'Grace');
});

test('login is case-insensitive on the email', async () => {
  const { email, password } = await register();

  const res = await call('POST', '/api/auth/login', {
    body: { email: email.toUpperCase(), password },
  });

  assert.equal(res.status, 200);
});

test('/auth/me rejects a missing, malformed or forged token', async () => {
  assert.equal((await call('GET', '/api/auth/me')).status, 401);
  assert.equal((await call('GET', '/api/auth/me', { token: 'garbage' })).status, 401);
  // Signed with a different secret — must not be trusted.
  const forged = require('jsonwebtoken').sign({ sub: 1 }, 'some-other-secret');
  assert.equal((await call('GET', '/api/auth/me', { token: forged })).status, 401);
});

// ── Change password ──────────────────────────────────────────────────────────

test('changing a password requires the current one', async () => {
  // Without this check, a stolen token (not the password) would be enough to
  // permanently take over an account.
  const { email, password, token } = await register();

  const res = await call('PUT', '/api/auth/password', {
    token,
    body: { currentPassword: 'not-my-password', newPassword: 'a-brand-new-password' },
  });

  assert.equal(res.status, 401);
  assert.match(res.body.error, /current password is incorrect/i);

  // And the old password must still work.
  const login = await call('POST', '/api/auth/login', { body: { email, password } });
  assert.equal(login.status, 200);
});

test('changing a password requires authentication at all', async () => {
  const { email, password } = await register();

  const res = await call('PUT', '/api/auth/password', {
    body: { currentPassword: password, newPassword: 'a-brand-new-password' },
  });

  assert.equal(res.status, 401);

  const login = await call('POST', '/api/auth/login', { body: { email, password } });
  assert.equal(login.status, 200, 'the password must be unchanged');
});

test('a successful password change invalidates the old password and accepts the new one', async () => {
  const { email, password, token } = await register();
  const newPassword = 'an-entirely-new-password';

  const changed = await call('PUT', '/api/auth/password', {
    token,
    body: { currentPassword: password, newPassword },
  });
  assert.equal(changed.status, 200);
  assert.equal(changed.body.ok, true);

  const old = await call('POST', '/api/auth/login', { body: { email, password } });
  assert.equal(old.status, 401, 'the old password must stop working');

  const fresh = await call('POST', '/api/auth/login', { body: { email, password: newPassword } });
  assert.equal(fresh.status, 200);
});

test('a new password must clear the same strength bar as registration', async () => {
  // The change-password route reuses passwordSchema; if it ever dropped to a
  // bare string the account could be downgraded to a 3-char password.
  const { email, password, token } = await register();

  const weak = await call('PUT', '/api/auth/password', {
    token,
    body: { currentPassword: password, newPassword: 'abc' },
  });
  assert.equal(weak.status, 400);
  assert.match(weak.body.error, /at least 8 characters/i);

  const same = await call('PUT', '/api/auth/password', {
    token,
    body: { currentPassword: password, newPassword: password },
  });
  assert.equal(same.status, 400);
  assert.match(same.body.error, /must differ/i);

  const asEmail = await call('PUT', '/api/auth/password', {
    token,
    body: { currentPassword: password, newPassword: email },
  });
  assert.equal(asEmail.status, 400);
  assert.match(asEmail.body.error, /cannot equal email/i);

  const stillWorks = await call('POST', '/api/auth/login', { body: { email, password } });
  assert.equal(stillWorks.status, 200, 'no rejected change may have been partially applied');
});

// ── Change email ─────────────────────────────────────────────────────────────

test('changing an email requires the current password', async () => {
  const { email, token } = await register();

  const res = await call('PUT', '/api/auth/email', {
    token,
    body: { currentPassword: 'wrong', newEmail: uniqueEmail() },
  });

  assert.equal(res.status, 401);
  const me = await call('GET', '/api/auth/me', { token });
  assert.equal(me.body.user.email, email, 'the email must be unchanged');
});

test('changing an email to one already taken is refused', async () => {
  const taken = await register();
  const mover = await register();

  const res = await call('PUT', '/api/auth/email', {
    token: mover.token,
    body: { currentPassword: mover.password, newEmail: taken.email },
  });

  assert.equal(res.status, 409);
  const me = await call('GET', '/api/auth/me', { token: mover.token });
  assert.equal(me.body.user.email, mover.email);
});

// ── Middleware ───────────────────────────────────────────────────────────────

test('requireAuth rejects a valid token whose user has been deleted', async () => {
  // Account deletion must not leave a still-usable 7-day token behind.
  const { token, user } = await register();
  assert.equal((await call('GET', '/api/auth/me', { token })).status, 200);

  db.deleteUser(user.id);

  const res = await call('GET', '/api/auth/me', { token });
  assert.equal(res.status, 401);
  assert.match(res.body.error, /no longer exists/i);
});

test('sanitizeUser normalises is_admin and pro_tier without leaking secrets', () => {
  const clean = auth.sanitizeUser({
    id: 7,
    email: 'x@example.test',
    password_hash: 'super-secret',
    stripe_customer_id: 'cus_123',
    stripe_subscription_id: 'sub_123',
    is_admin: 0,
    pro_tier: null,
  });

  assert.equal(clean.password_hash, undefined);
  assert.equal(clean.stripe_customer_id, undefined);
  assert.equal(clean.stripe_subscription_id, undefined);
  assert.equal(clean.is_admin, 0);
  assert.equal(clean.pro_tier, 'free');
  assert.equal(auth.sanitizeUser(null), null);
});
