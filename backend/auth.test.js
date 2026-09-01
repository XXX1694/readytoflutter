'use strict';

// Tests for backend/auth.js — the register / login / change-password routes
// and the single-use account-recovery codes.
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
const bcrypt = require('bcryptjs');
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

// Register a user and return { email, password, token, user, recoveryCode }.
const register = async (overrides = {}) => {
  const email = overrides.email || uniqueEmail();
  const password = overrides.password || 'correct-horse-battery';
  const res = await call('POST', '/api/auth/register', {
    body: { email, password, name: overrides.name ?? null },
  });
  assert.equal(res.status, 201, `fixture registration failed: ${res.raw}`);
  return {
    email,
    password,
    token: res.body.token,
    user: res.body.user,
    recoveryCode: res.body.recoveryCode,
  };
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

// ── Account recovery ─────────────────────────────────────────────────────────
//
// There is no email provider, so "forgot password" is a single-use code handed
// out once at registration — the 2FA-backup-code model. Two things have to hold
// at the same time: the code must be usable by a human reading it off paper,
// and it must never turn the reset form into an "is this address registered?"
// oracle. Every test below names the failure it prevents.

// Crockford base32: four groups of five, and no I, L, O or U anywhere.
const RECOVERY_CODE_RE = /^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{5}(?:-[0-9ABCDEFGHJKMNPQRSTVWXYZ]{5}){3}$/;

// The one message every reset failure must return, verbatim.
const RESET_FAILURE = 'That email and recovery code do not match.';

// A syntactically perfect code that no account was ever issued. Collides with a
// real one at 2^-100, which is the point of the 100-bit code.
const WRONG_CODE = 'ABCDE-FGHJK-MNPQR-STVWX';

const resetPassword = (body) => call('POST', '/api/auth/recovery/reset', { body });
const loginAs = (email, password) => call('POST', '/api/auth/login', { body: { email, password } });

test('register issues a recovery code in the documented shape and alphabet', async () => {
  // A generator that drifts — wrong length, or an alphabet that lets I/L/O/U
  // back in — mints codes users mistype and can then never redeem.
  const res = await call('POST', '/api/auth/register', {
    body: { email: uniqueEmail(), password: 'correct-horse-battery', name: null },
  });

  assert.equal(res.status, 201);
  assert.match(res.body.recoveryCode, RECOVERY_CODE_RE);
  assert.equal(res.body.recoveryCode.replace(/-/g, '').length, 20, '20 chars x 5 bits = 100 bits');
  assert.doesNotMatch(res.body.recoveryCode, /[ILOU]/, 'Crockford base32 omits I, L, O and U');
});

test('the recovery code is unique per account, not a constant', async () => {
  // A stubbed or seeded generator would hand every account the same key.
  const a = await register();
  const b = await register();

  assert.notEqual(a.recoveryCode, b.recoveryCode);
});

test('register advertises the recovery code without ever leaking its hash', async () => {
  // has_recovery_code tells the owner only what they already know; the bcrypt
  // hash is a second password and must never cross the wire.
  const res = await call('POST', '/api/auth/register', {
    body: { email: uniqueEmail(), password: 'correct-horse-battery', name: null },
  });

  assert.equal(res.status, 201);
  assert.equal(res.body.user.has_recovery_code, 1);
  assert.equal(res.body.user.recovery_code_hash, undefined);
  assert.equal(res.body.user.recovery_code_set_at, undefined);
  assert.ok(!res.raw.includes('recovery_code_hash'), `hash leaked in register body: ${res.raw}`);

  const me = await call('GET', '/api/auth/me', { token: res.body.token });
  assert.equal(me.body.user.has_recovery_code, 1);
  assert.ok(!me.raw.includes('recovery_code_hash'), `hash leaked in /auth/me: ${me.raw}`);
});

test('redeeming a recovery code actually replaces the password', async () => {
  // {ok: true} on its own proves nothing — the point of the flow is that the
  // old password stops working and the chosen one starts.
  const { email, password, recoveryCode } = await register();
  const newPassword = 'recovered-into-a-new-password';

  const res = await resetPassword({ email, code: recoveryCode, newPassword });
  assert.equal(res.status, 200);
  assert.equal(res.body.ok, true);

  assert.equal((await loginAs(email, password)).status, 401, 'the replaced password must stop working');
  assert.equal((await loginAs(email, newPassword)).status, 200);
});

test('a reset does not sign the user in', async () => {
  // Holding a code proves you can set a password, not that you are already
  // logged in — a code that minted a session would be a bearer credential.
  const { email, recoveryCode } = await register();

  const res = await resetPassword({ email, code: recoveryCode, newPassword: 'another-fresh-password' });

  assert.equal(res.status, 200);
  assert.equal(res.body.token, undefined);
  assert.equal(res.body.user, undefined);
});

test('a spent recovery code cannot be replayed', async () => {
  // Anyone who saw the code once — a screenshot, a shoulder — would otherwise
  // hold a permanent way back into the account.
  const { email, recoveryCode } = await register();
  const firstPassword = 'first-recovered-password';

  assert.equal((await resetPassword({ email, code: recoveryCode, newPassword: firstPassword })).status, 200);

  const replay = await resetPassword({ email, code: recoveryCode, newPassword: 'attacker-chosen-password' });
  assert.equal(replay.status, 401);
  assert.equal(replay.body.error, RESET_FAILURE);

  assert.equal((await loginAs(email, firstPassword)).status, 200, 'the replay must not have changed anything');
});

test('the replacement code handed back by a reset is itself redeemable', async () => {
  // Burning the code without issuing a live replacement would leave the
  // account with no way back after a single recovery.
  const { email, recoveryCode } = await register();

  const first = await resetPassword({ email, code: recoveryCode, newPassword: 'first-recovered-password' });
  assert.equal(first.status, 200);
  assert.match(first.body.recoveryCode, RECOVERY_CODE_RE);
  assert.notEqual(first.body.recoveryCode, recoveryCode);

  const second = await resetPassword({
    email,
    code: first.body.recoveryCode,
    newPassword: 'second-recovered-password',
  });
  assert.equal(second.status, 200);
  assert.equal((await loginAs(email, 'second-recovered-password')).status, 200);
});

test('a code typed back in lower case with spaces instead of dashes still redeems', async () => {
  // This is how it comes back off a sticky note. Case-sensitive or
  // dash-sensitive matching locks out the users who did everything right.
  const { email, recoveryCode } = await register();
  const typed = `  ${recoveryCode.replace(/-/g, '  ').toLowerCase()}  `;

  assert.equal((await resetPassword({ email, code: typed, newPassword: 'typed-it-back-by-hand' })).status, 200);
  assert.equal((await loginAs(email, 'typed-it-back-by-hand')).status, 200);
});

test('the O/0 and I/L/1 glyph confusions are folded away before comparison', async () => {
  // Planted rather than generated: the alphabet deliberately never emits I, L
  // or O, so installing a known hash is the only way to exercise every fold in
  // one code. The stored value is a hash of the *normalised* code, exactly as
  // issueRecoveryCode writes it.
  const { email } = await register();
  const user = db.getUserByEmail(email);
  db.setRecoveryCode(user.id, bcrypt.hashSync('0110123456ABCDEFGHJK', 10));

  // Written out by a human: O for 0, I and L (both cases) for 1, spaces for
  // dashes, and the letters in lower case.
  const typed = 'oIlOL 23456 abcde fghjk';

  assert.equal((await resetPassword({ email, code: typed, newPassword: 'read-off-a-sticky-note' })).status, 200);
  assert.equal((await loginAs(email, 'read-off-a-sticky-note')).status, 200);
});

test('an unknown address and a wrong code are indistinguishable from outside', async () => {
  // Different wording, or a different status, turns the reset form into an
  // account-enumeration oracle for the whole user base.
  //
  // The route also compares against a dummy hash when there is no user, so the
  // two paths should cost the same. We assert shape, not timing: a wall-clock
  // bound would be flaky on a loaded CI box. See the note in the report — the
  // dummy hash is currently malformed, so the timing equalisation does not in
  // fact hold, and asserting it here would only pin the defect in place.
  const { email } = await register();

  const unknown = await resetPassword({
    email: uniqueEmail(),
    code: WRONG_CODE,
    newPassword: 'some-new-password',
  });
  const wrongCode = await resetPassword({ email, code: WRONG_CODE, newPassword: 'some-new-password' });

  assert.equal(unknown.status, 401);
  assert.equal(wrongCode.status, unknown.status);
  assert.equal(unknown.raw, wrongCode.raw, 'the body must not distinguish the two failures');
  assert.equal(unknown.body.error, RESET_FAILURE);
});

test('a wrong code changes nothing and does not burn the real one', async () => {
  const { email, password, recoveryCode } = await register();

  assert.equal((await resetPassword({ email, code: WRONG_CODE, newPassword: 'attacker-chosen-password' })).status, 401);

  assert.equal((await loginAs(email, password)).status, 200, 'the password must be untouched');
  assert.equal((await loginAs(email, 'attacker-chosen-password')).status, 401);
  assert.equal(
    (await resetPassword({ email, code: recoveryCode, newPassword: 'the-owner-recovers-later' })).status,
    200,
    'a failed guess must not invalidate the live code',
  );
});

test('a reset password must clear the same bar as registration', async () => {
  // Recovery is the one path where the password is chosen without proving the
  // old one; if it skipped passwordSchema the account could be downgraded to
  // eight spaces by anyone holding the code.
  const { email, password, recoveryCode } = await register();

  const short = await resetPassword({ email, code: recoveryCode, newPassword: 'short7!' });
  assert.equal(short.status, 400);
  assert.match(short.body.error, /at least 8 characters/i);

  const blank = await resetPassword({ email, code: recoveryCode, newPassword: '            ' });
  assert.equal(blank.status, 400);
  assert.match(blank.body.error, /at least 8 characters/i);

  const asEmail = await resetPassword({ email, code: recoveryCode, newPassword: email });
  assert.equal(asEmail.status, 400);
  assert.match(asEmail.body.error, /cannot equal email/i);

  assert.equal((await loginAs(email, password)).status, 200, 'no rejected reset may be partially applied');
  assert.equal(
    (await resetPassword({ email, code: recoveryCode, newPassword: 'finally-a-good-password' })).status,
    200,
    'a rejected password must not have consumed the code',
  );
});

test('regenerating a recovery code requires a session', async () => {
  const { email, recoveryCode } = await register();

  const res = await call('POST', '/api/auth/recovery/regenerate', {
    body: { currentPassword: 'correct-horse-battery' },
  });

  assert.equal(res.status, 401);
  assert.equal(res.body.recoveryCode, undefined);
  assert.equal(
    (await resetPassword({ email, code: recoveryCode, newPassword: 'the-owners-code-survived' })).status,
    200,
    'an anonymous regenerate must not rotate anything',
  );
});

test('regenerating a recovery code requires the current password', async () => {
  // Otherwise a borrowed session quietly mints itself a permanent way back in,
  // long after the token expires.
  const { email, token, recoveryCode } = await register();

  const res = await call('POST', '/api/auth/recovery/regenerate', {
    token,
    body: { currentPassword: 'not-my-password' },
  });

  assert.equal(res.status, 401);
  assert.match(res.body.error, /current password is incorrect/i);
  assert.equal(res.body.recoveryCode, undefined);
  assert.equal(
    (await resetPassword({ email, code: recoveryCode, newPassword: 'the-old-code-survived' })).status,
    200,
    'a refused regenerate must not invalidate the live code',
  );
});

test('regenerating invalidates the previous code and issues a working replacement', async () => {
  // The reason to regenerate is that the old code leaked; if it kept working
  // the button would be theatre.
  const { email, password, token, recoveryCode } = await register();

  const regen = await call('POST', '/api/auth/recovery/regenerate', {
    token,
    body: { currentPassword: password },
  });
  assert.equal(regen.status, 200);
  assert.match(regen.body.recoveryCode, RECOVERY_CODE_RE);
  assert.notEqual(regen.body.recoveryCode, recoveryCode);
  assert.ok(!regen.raw.includes('recovery_code_hash'), `hash leaked in regenerate body: ${regen.raw}`);

  const stale = await resetPassword({ email, code: recoveryCode, newPassword: 'should-never-apply' });
  assert.equal(stale.status, 401);
  assert.equal(stale.body.error, RESET_FAILURE);
  assert.equal((await loginAs(email, password)).status, 200, 'the stale code must have changed nothing');

  assert.equal(
    (await resetPassword({ email, code: regen.body.recoveryCode, newPassword: 'regenerated-and-redeemed' })).status,
    200,
  );
  assert.equal((await loginAs(email, 'regenerated-and-redeemed')).status, 200);
});

test('an account predating recovery codes cannot reset, and fails identically', async () => {
  // createUser leaves recovery_code_hash NULL, exactly like every row written
  // before the migration. A NULL hash must not be treated as "matches
  // anything", and must not announce itself as a different kind of failure.
  const email = uniqueEmail();
  const password = 'legacy-account-password';
  const legacy = db.createUser({ email, passwordHash: bcrypt.hashSync(password, 10), name: null });
  assert.equal(legacy.recovery_code_hash, null, 'fixture must have no recovery code');

  const res = await resetPassword({ email, code: WRONG_CODE, newPassword: 'a-brand-new-password' });

  assert.equal(res.status, 401);
  assert.equal(res.body.error, RESET_FAILURE);
  assert.equal((await loginAs(email, password)).status, 200, 'the legacy password must be untouched');
  assert.equal((await loginAs(email, 'a-brand-new-password')).status, 401);
});

test('a legacy account reports has_recovery_code 0 and can adopt one', async () => {
  // The flag is how Settings knows to prompt; if it read 1 for a NULL hash the
  // user would never be offered a code they do not have.
  const email = uniqueEmail();
  const password = 'legacy-account-password';
  db.createUser({ email, passwordHash: bcrypt.hashSync(password, 10), name: null });

  const session = await loginAs(email, password);
  assert.equal(session.status, 200);
  assert.equal(session.body.user.has_recovery_code, 0);

  const regen = await call('POST', '/api/auth/recovery/regenerate', {
    token: session.body.token,
    body: { currentPassword: password },
  });
  assert.equal(regen.status, 200);

  const me = await call('GET', '/api/auth/me', { token: session.body.token });
  assert.equal(me.body.user.has_recovery_code, 1);
  assert.equal(
    (await resetPassword({ email, code: regen.body.recoveryCode, newPassword: 'adopted-a-recovery-code' })).status,
    200,
  );
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
