'use strict';

// Tests for backend/push.js — Web Push subscriptions and the daily reminder job.
//
// The failure modes here are quiet ones. A duplicated subscription row sends a
// user two copies of every notification. A dead endpoint that is never deleted
// re-fails on every run forever. A once-per-day guard held in memory instead of
// SQLite re-sends today's push on every deploy. None of that shows up in the UI
// — the user just quietly starts ignoring the app. Every test names the
// specific failure it prevents.
//
// Isolation: ONSITE_DATA_DIR (the test seam in database.js) points the SQLite
// file *and* the seed directory at a throwaway temp dir, so the developer's
// real backend/data/interview.db is never opened.
//
// Delivery is faked by replacing `sendNotification` on the shared `web-push`
// module object — push.js reads that property at call time, so the fake is
// seen without any production-code seam. Nothing in this suite talks to a real
// push service.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const BetterSqlite3 = require('better-sqlite3');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'onsite-push-test-'));
fs.cpSync(path.join(__dirname, 'data', 'seed'), path.join(tmpDir, 'seed'), { recursive: true });

process.env.ONSITE_DATA_DIR = tmpDir;
process.env.JWT_SECRET = 'test-secret-for-push-tests-only-not-a-real-secret';
delete process.env.ADMIN_BOOTSTRAP_EMAIL;
delete process.env.PUSH_CRON_SECRET;
// Pin the send window so the local-hour arithmetic below is deterministic even
// if a developer has these set in their shell.
delete process.env.PUSH_SEND_HOUR;
delete process.env.PUSH_QUIET_HOUR;

const express = require('express');
const webpush = require('web-push');
const db = require('./database');
const auth = require('./auth');
const push = require('./push');

db.init();

// Real (throwaway) VAPID keys: web-push validates their shape before it would
// ever hit the network, and a malformed pair would fail for the wrong reason.
const VAPID = webpush.generateVAPIDKeys();
const enablePush = () => {
  process.env.VAPID_PUBLIC_KEY = VAPID.publicKey;
  process.env.VAPID_PRIVATE_KEY = VAPID.privateKey;
  process.env.VAPID_SUBJECT = 'mailto:test@example.test';
};
const disablePush = () => {
  delete process.env.VAPID_PUBLIC_KEY;
  delete process.env.VAPID_PRIVATE_KEY;
};
enablePush();

const app = express();
// One hop, so req.ip comes from X-Forwarded-For and each test gets its own
// rate-limit bucket.
app.set('trust proxy', 1);
app.use(express.json());
auth.attach(app);
push.attach(app);

// Second, read-only connection: the HTTP responses deliberately never echo an
// endpoint or a key, so the persisted row is the only place to assert on.
const reader = new BetterSqlite3(path.join(tmpDir, 'interview.db'), { readonly: true });
const readSubs = (userId) => reader
  .prepare('SELECT * FROM push_subscriptions WHERE user_id = ? ORDER BY id')
  .all(userId);
const readSubByEndpoint = (endpoint) => reader
  .prepare('SELECT * FROM push_subscriptions WHERE endpoint = ?')
  .get(endpoint);
const countAllSubs = () => reader
  .prepare('SELECT COUNT(*) AS c FROM push_subscriptions')
  .get().c;

// runDailyJob() scans every device in the database, so without this each job
// test would also be acting on the devices its predecessors left behind — and
// would pass or fail for reasons that have nothing to do with what it asserts.
const writer = new BetterSqlite3(path.join(tmpDir, 'interview.db'));
const clearSubs = () => writer.prepare('DELETE FROM push_subscriptions').run();

let server;
let baseUrl;

// The real sender, restored after every test that fakes it.
const realSend = webpush.sendNotification;

test.before(async () => {
  await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve); });
  server.unref();
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  webpush.sendNotification = realSend;
  push.stopScheduler();
  await new Promise((resolve) => server.close(resolve));
  writer.close();
  reader.close();
  db.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test.beforeEach(() => {
  clearSubs();
});

test.afterEach(() => {
  webpush.sendNotification = realSend;
  enablePush();
});

// Distinct source IP per call keeps every test under the shared limiters.
let ipSeq = 0;
const nextIp = () => `10.1.${Math.floor(ipSeq / 250)}.${(ipSeq++ % 250) + 1}`;

const call = async (method, route, { body, token, ip, headers: extra } = {}) => {
  const headers = { 'X-Forwarded-For': ip || nextIp(), ...extra };
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

let seq = 0;
const uniq = () => `${Date.now()}-${seq++}`;

const register = async (overrides = {}) => {
  const email = `push-${uniq()}@example.test`;
  const res = await call('POST', '/api/auth/register', {
    body: { email, password: 'correct-horse-battery', ...overrides },
  });
  assert.equal(res.status, 201, `register failed: ${res.raw}`);
  return { email, token: res.body.token, user: res.body.user };
};

// A plausible FCM-shaped endpoint. Unique per call so tests never collide on
// the UNIQUE index.
const newEndpoint = () => `https://fcm.googleapis.com/fcm/send/${uniq()}-${Math.random().toString(36).slice(2)}`;

const subscriptionBody = (endpoint, extra = {}) => ({
  subscription: {
    endpoint,
    keys: { p256dh: 'BF'.padEnd(87, 'x'), auth: 'abcd1234abcd1234abcd12' },
  },
  tzOffsetMinutes: 0,
  ...extra,
});

// ── Disabled path ───────────────────────────────────────────────────────────

test('with no VAPID keys the whole feature degrades instead of erroring', async () => {
  // The deployment default is "no keys". If any of this 500s or throws, an
  // unconfigured server is a broken server rather than a server without
  // reminders — the exact failure ai.js's `enabled:false` shape exists to avoid.
  disablePush();
  const { token } = await register();

  const health = await call('GET', '/api/push/health');
  assert.equal(health.status, 200);
  assert.equal(health.body.enabled, false);
  assert.equal(health.body.reason, 'keys_missing');
  assert.equal(health.body.publicKey, null, 'a disabled server must not advertise a key');

  for (const [method, route, body] of [
    ['POST', '/api/push/subscribe', subscriptionBody(newEndpoint())],
    ['POST', '/api/push/state', { endpoint: newEndpoint(), dueCount: 3 }],
    ['POST', '/api/push/test', {}],
  ]) {
    const res = await call(method, route, { body, token });
    assert.equal(res.status, 503, `${route} should 503 when push is unconfigured`);
    assert.equal(res.body.code, 'push_disabled');
    assert.equal(res.body.reason, 'keys_missing');
  }

  // The job must be a no-op, not a crash, on an unconfigured server — the
  // in-process timer calls it every 15 minutes regardless.
  const summary = await push.runDailyJob();
  assert.deepEqual(summary, { enabled: false, reason: 'keys_missing' });
});

test('unsubscribe still works after the keys are pulled from the environment', async () => {
  // Turning notifications OFF must never be blocked by the server's own
  // misconfiguration, or a user whose admin rotated the keys is stuck
  // subscribed with no way to say stop.
  const { token } = await register();
  const endpoint = newEndpoint();
  await call('POST', '/api/push/subscribe', { body: subscriptionBody(endpoint), token });

  disablePush();
  const res = await call('POST', '/api/push/unsubscribe', { body: { endpoint }, token });

  assert.equal(res.status, 200);
  assert.equal(res.body.removed, true);
  assert.equal(readSubByEndpoint(endpoint), undefined);
});

test('the public key is served only while the feature is enabled', async () => {
  const res = await call('GET', '/api/push/health');
  assert.equal(res.body.enabled, true);
  assert.equal(res.body.publicKey, VAPID.publicKey);
  // The private key must never appear anywhere in the response.
  assert.ok(!res.raw.includes(VAPID.privateKey), 'health leaked the VAPID private key');
});

// ── Auth + validation ───────────────────────────────────────────────────────

test('every write endpoint requires authentication', async () => {
  for (const [route, body] of [
    ['/api/push/subscribe', subscriptionBody(newEndpoint())],
    ['/api/push/state', { endpoint: newEndpoint(), dueCount: 1 }],
    ['/api/push/unsubscribe', { endpoint: newEndpoint() }],
    ['/api/push/test', {}],
    ['/api/push/run-daily', {}],
  ]) {
    const res = await call('POST', route, { body });
    assert.equal(res.status, 401, `${route} must not be callable anonymously`);
  }
});

test('subscribe rejects a malformed or non-https endpoint instead of storing it', async () => {
  // A stored junk endpoint is a row the delivery path will fail on forever;
  // http:// in particular is never a real push endpoint.
  const { token } = await register();
  const before = countAllSubs();

  for (const body of [
    {},
    { subscription: { endpoint: 'http://insecure.example/push', keys: { p256dh: 'x'.repeat(20), auth: 'y'.repeat(20) } } },
    { subscription: { endpoint: newEndpoint() } },
    { subscription: { endpoint: newEndpoint(), keys: { p256dh: 'short' } } },
    subscriptionBody(newEndpoint(), { tzOffsetMinutes: 9999 }),
    subscriptionBody(newEndpoint(), { dueCount: -1 }),
    subscriptionBody(newEndpoint(), { nextDueAt: 'tomorrow-ish' }),
  ]) {
    const res = await call('POST', '/api/push/subscribe', { body, token });
    assert.equal(res.status, 400, `should have rejected ${JSON.stringify(body).slice(0, 80)}`);
    assert.equal(res.body.code, 'bad_input');
  }
  assert.equal(countAllSubs(), before, 'a rejected subscribe wrote a row anyway');
});

// ── Upsert, not duplicate ───────────────────────────────────────────────────

test('re-subscribing the same browser upserts one row instead of duplicating it', async () => {
  // A browser re-subscribes on every service-worker activation. If each one
  // inserted, the user would receive N copies of every notification and N
  // would grow with every app open.
  const { token, user } = await register();
  const endpoint = newEndpoint();

  const first = await call('POST', '/api/push/subscribe', {
    body: subscriptionBody(endpoint, { dueCount: 2, tzOffsetMinutes: -180 }),
    token,
  });
  assert.equal(first.status, 201);

  for (let i = 0; i < 3; i += 1) {
    const again = await call('POST', '/api/push/subscribe', {
      body: subscriptionBody(endpoint, { dueCount: 7, tzOffsetMinutes: -180 }),
      token,
    });
    assert.equal(again.status, 201);
  }

  const rows = readSubs(user.id);
  assert.equal(rows.length, 1, `expected exactly one row per browser, got ${rows.length}`);
  assert.equal(rows[0].id, first.body.device.id, 'the upsert replaced the row instead of updating it');
  assert.equal(rows[0].due_count, 7, 'the re-subscribe did not refresh the SRS snapshot');
  assert.equal(rows[0].created_at, first.body.device.created_at, 'created_at must survive an upsert');
  assert.ok(rows[0].last_seen_at >= rows[0].created_at);
});

test('a second account subscribing on the same browser takes the endpoint over', async () => {
  // Push endpoints belong to the browser, not the session. On a shared machine
  // the row must follow the new owner — otherwise the previous account keeps
  // receiving its reminders on someone else's device.
  const alice = await register();
  const bob = await register();
  const endpoint = newEndpoint();

  await call('POST', '/api/push/subscribe', { body: subscriptionBody(endpoint), token: alice.token });
  await call('POST', '/api/push/subscribe', { body: subscriptionBody(endpoint), token: bob.token });

  assert.equal(readSubs(alice.user.id).length, 0, "alice still owns bob's browser");
  assert.equal(readSubs(bob.user.id).length, 1);
  assert.equal(readSubByEndpoint(endpoint).user_id, bob.user.id);
});

test('one user cannot unsubscribe or rewrite the state of another user device', async () => {
  const alice = await register();
  const bob = await register();
  const endpoint = newEndpoint();
  await call('POST', '/api/push/subscribe', {
    body: subscriptionBody(endpoint, { dueCount: 4 }),
    token: alice.token,
  });

  const stolen = await call('POST', '/api/push/state', {
    body: { endpoint, dueCount: 0 },
    token: bob.token,
  });
  assert.equal(stolen.status, 404);
  assert.equal(readSubByEndpoint(endpoint).due_count, 4, "bob rewrote alice's due count");

  const killed = await call('POST', '/api/push/unsubscribe', { body: { endpoint }, token: bob.token });
  assert.equal(killed.body.removed, false);
  assert.ok(readSubByEndpoint(endpoint), "bob deleted alice's subscription");
});

test('deleting an account deletes its push subscriptions', async () => {
  // A surviving row would keep pushing to a device whose account no longer
  // exists — and the daily job would happily deliver it.
  const { token, user } = await register();
  await call('POST', '/api/push/subscribe', { body: subscriptionBody(newEndpoint()), token });
  await call('POST', '/api/push/subscribe', { body: subscriptionBody(newEndpoint()), token });
  assert.equal(readSubs(user.id).length, 2);

  const res = await call('DELETE', '/api/auth/me', { token });
  assert.equal(res.status, 200);
  assert.equal(readSubs(user.id).length, 0);
});

// ── State reporting ─────────────────────────────────────────────────────────

test('state sync refreshes the SRS snapshot without touching the stored keys', async () => {
  const { token, user } = await register();
  const endpoint = newEndpoint();
  await call('POST', '/api/push/subscribe', { body: subscriptionBody(endpoint), token });
  const before = readSubByEndpoint(endpoint);

  const res = await call('POST', '/api/push/state', {
    body: { endpoint, dueCount: 12, nextDueAt: '2026-09-05T06:00:00.000Z', tzOffsetMinutes: -180 },
    token,
  });

  assert.equal(res.status, 200);
  const after = readSubs(user.id)[0];
  assert.equal(after.due_count, 12);
  assert.equal(after.next_due_at, '2026-09-05T06:00:00.000Z');
  assert.equal(after.tz_offset_minutes, -180);
  assert.equal(after.p256dh, before.p256dh, 'state sync clobbered the encryption key');
  assert.equal(after.auth, before.auth);
  assert.ok(after.state_reported_at >= before.created_at);
});

test('re-subscribing without a snapshot keeps the last reported one', async () => {
  // A service worker re-subscribes on activation and may not have the question
  // list to hand. Wiping due_count there would leave state_reported_at saying
  // "we have a snapshot" beside a snapshot of zero — and the device would go
  // quiet until the next full sync.
  const { token } = await register();
  const endpoint = newEndpoint();
  await call('POST', '/api/push/subscribe', {
    body: subscriptionBody(endpoint, { dueCount: 6, nextDueAt: '2026-09-09T00:00:00.000Z' }),
    token,
  });
  const reported = readSubByEndpoint(endpoint).state_reported_at;

  await call('POST', '/api/push/subscribe', { body: subscriptionBody(endpoint), token });

  const row = readSubByEndpoint(endpoint);
  assert.equal(row.due_count, 6, 'a keyless re-subscribe zeroed the SRS snapshot');
  assert.equal(row.next_due_at, '2026-09-09T00:00:00.000Z');
  assert.equal(row.state_reported_at, reported);
});

test('a state sync that omits the offset keeps the stored one', async () => {
  // A sync that silently reset the device to UTC would move a UTC+3 user's
  // 09:00 reminder to 12:00 local.
  const { token } = await register();
  const endpoint = newEndpoint();
  await call('POST', '/api/push/subscribe', {
    body: subscriptionBody(endpoint, { tzOffsetMinutes: -180 }),
    token,
  });

  await call('POST', '/api/push/state', { body: { endpoint, dueCount: 1 }, token });

  assert.equal(readSubByEndpoint(endpoint).tz_offset_minutes, -180);
});

// ── Delivery hygiene ────────────────────────────────────────────────────────

// Build a subscription that the daily job will consider: state reported now,
// a due count, and an offset that puts the device inside the send window at
// the instant the test drives the clock to.
const seedDueDevice = async ({ dueCount = 3, tzOffsetMinutes = 0, nextDueAt } = {}) => {
  const { token, user } = await register();
  const endpoint = newEndpoint();
  const res = await call('POST', '/api/push/subscribe', {
    body: subscriptionBody(endpoint, { dueCount, tzOffsetMinutes, nextDueAt }),
    token,
  });
  assert.equal(res.status, 201, res.raw);
  return { token, user, endpoint, id: res.body.device.id };
};

// 10:00 UTC — inside the default 09:00–22:00 window for a UTC device.
const AT_10_UTC = new Date('2026-09-02T10:00:00.000Z');

test('a 410 from the push service deletes the dead subscription', async () => {
  // 404/410 is the vendor saying "this browser is gone". Keeping the row means
  // every future run re-fails on it, forever, for every uninstall.
  const device = await seedDueDevice();
  webpush.sendNotification = async () => {
    const err = new Error('Gone');
    err.statusCode = 410;
    throw err;
  };

  const summary = await push.runDailyJob({ now: AT_10_UTC });

  assert.equal(summary.gone, 1);
  assert.equal(summary.sent, 0);
  assert.equal(readSubByEndpoint(device.endpoint), undefined, 'the dead subscription survived');
});

test('a 404 from the push service also deletes the subscription', async () => {
  const device = await seedDueDevice();
  webpush.sendNotification = async () => {
    const err = new Error('Not Found');
    err.statusCode = 404;
    throw err;
  };

  await push.runDailyJob({ now: AT_10_UTC });

  assert.equal(readSubByEndpoint(device.endpoint), undefined);
});

test('a transient 500 never crashes the job and never deletes the subscription', async () => {
  // The opposite mistake: treating every error as fatal would wipe live
  // subscriptions the first time a push service had a bad afternoon.
  const device = await seedDueDevice();
  webpush.sendNotification = async () => {
    const err = new Error('Internal Server Error');
    err.statusCode = 500;
    throw err;
  };

  const summary = await push.runDailyJob({ now: AT_10_UTC });

  assert.equal(summary.failed, 1);
  assert.equal(summary.gone, 0);
  assert.ok(readSubByEndpoint(device.endpoint), 'a 500 deleted a live subscription');
});

test('one dead device does not stop the job reaching the others', async () => {
  const dead = await seedDueDevice();
  const alive = await seedDueDevice();
  webpush.sendNotification = async (sub) => {
    if (sub.endpoint === dead.endpoint) {
      const err = new Error('Gone');
      err.statusCode = 410;
      throw err;
    }
    return { statusCode: 201 };
  };

  const summary = await push.runDailyJob({ now: AT_10_UTC });

  assert.ok(summary.sent >= 1, 'the healthy device was skipped after the dead one failed');
  assert.equal(readSubByEndpoint(dead.endpoint), undefined);
  assert.ok(readSubByEndpoint(alive.endpoint));
  assert.ok(readSubByEndpoint(alive.endpoint).last_notified_at);
});

test('a failing device does not 500 the test-notification request', async () => {
  const { token } = await register();
  await call('POST', '/api/push/subscribe', { body: subscriptionBody(newEndpoint()), token });
  webpush.sendNotification = async () => {
    const err = new Error('Gone');
    err.statusCode = 410;
    throw err;
  };

  const res = await call('POST', '/api/push/test', { body: {}, token });

  assert.equal(res.status, 502);
  assert.equal(res.body.code, 'delivery_failed');
  assert.equal(res.body.gone, 1);
});

test('the test notification reaches every device the account has', async () => {
  const { token } = await register();
  await call('POST', '/api/push/subscribe', { body: subscriptionBody(newEndpoint()), token });
  await call('POST', '/api/push/subscribe', { body: subscriptionBody(newEndpoint()), token });

  const payloads = [];
  webpush.sendNotification = async (_sub, payload) => {
    payloads.push(JSON.parse(payload));
    return { statusCode: 201 };
  };

  const res = await call('POST', '/api/push/test', { body: {}, token });

  assert.equal(res.status, 200);
  assert.equal(res.body.sent, 2);
  assert.equal(payloads.length, 2);
  assert.equal(payloads[0].kind, 'test');
  assert.ok(payloads[0].title);
});

test('a test notification with no subscriptions is a 404, not a silent 200', async () => {
  const { token } = await register();
  const res = await call('POST', '/api/push/test', { body: {}, token });
  assert.equal(res.status, 404);
  assert.equal(res.body.code, 'not_subscribed');
});

// ── The once-per-day guard ──────────────────────────────────────────────────

test('a second run on the same local day sends nothing', async () => {
  // The guard lives in SQLite precisely so this holds across a process
  // restart, a cron firing next to the in-process timer, and the 15-minute
  // tick that follows the first send.
  const device = await seedDueDevice();
  let sends = 0;
  webpush.sendNotification = async () => { sends += 1; return { statusCode: 201 }; };

  const first = await push.runDailyJob({ now: AT_10_UTC });
  assert.equal(first.sent, 1);
  assert.equal(sends, 1);

  // Same day, later — this is the very next tick.
  const second = await push.runDailyJob({ now: new Date('2026-09-02T10:15:00.000Z') });
  assert.equal(second.sent, 0);
  assert.equal(second.skippedToday, 1);

  // ...and the last tick of the send window.
  const third = await push.runDailyJob({ now: new Date('2026-09-02T21:45:00.000Z') });
  assert.equal(third.sent, 0);

  assert.equal(sends, 1, 'the user was notified more than once in a day');
  assert.equal(readSubByEndpoint(device.endpoint).last_notified_at, AT_10_UTC.toISOString());
});

test('the guard is read from SQLite, so a restarted process does not re-send', async () => {
  // Simulated by driving the job with a last_notified_at that was written by
  // an earlier "process": nothing in module scope remembers it.
  const device = await seedDueDevice();
  db.markPushNotified(device.id, '2026-09-02T09:05:00.000Z');
  let sends = 0;
  webpush.sendNotification = async () => { sends += 1; return { statusCode: 201 }; };

  const summary = await push.runDailyJob({ now: AT_10_UTC });

  assert.equal(sends, 0, 'a fresh process re-sent a notification already delivered today');
  assert.equal(summary.skippedToday, 1);
});

test('the next local day sends again', async () => {
  // The mirror of the guard: if the date comparison were on absolute time
  // rather than the local calendar day, reminders would stop after the first.
  const device = await seedDueDevice();
  let sends = 0;
  webpush.sendNotification = async () => { sends += 1; return { statusCode: 201 }; };

  await push.runDailyJob({ now: AT_10_UTC });
  await push.runDailyJob({ now: new Date('2026-09-03T10:00:00.000Z') });

  assert.equal(sends, 2);
  assert.equal(readSubByEndpoint(device.endpoint).last_notified_at, '2026-09-03T10:00:00.000Z');
});

test('the day boundary is the device local day, not the UTC day', async () => {
  // A UTC+13 device notified at 21:00 UTC is already on the NEXT local day. If
  // the comparison used UTC dates it would be notified again 3 hours later at
  // 00:00 UTC — a second push inside one local day.
  const device = await seedDueDevice({ tzOffsetMinutes: -780 }); // UTC+13
  let sends = 0;
  webpush.sendNotification = async () => { sends += 1; return { statusCode: 201 }; };

  // 2026-09-02T21:00Z is 2026-09-03 10:00 local — inside the window.
  await push.runDailyJob({ now: new Date('2026-09-02T21:00:00.000Z') });
  assert.equal(sends, 1);

  // 2026-09-03T00:00Z is 2026-09-03 13:00 local — still the same local day.
  await push.runDailyJob({ now: new Date('2026-09-03T00:00:00.000Z') });
  assert.equal(sends, 1, 'crossing midnight UTC produced a second push on the same local day');

  assert.ok(readSubByEndpoint(device.endpoint));
});

// ── Quiet hours ─────────────────────────────────────────────────────────────

test('nothing is delivered outside the device local send window', async () => {
  // The whole reason the offset is captured at subscribe time. A UTC+3 device
  // at 00:00 UTC is at 03:00 local; a push there is worse than none.
  const device = await seedDueDevice({ tzOffsetMinutes: -180 }); // UTC+3
  let sends = 0;
  webpush.sendNotification = async () => { sends += 1; return { statusCode: 201 }; };

  const night = await push.runDailyJob({ now: new Date('2026-09-02T00:00:00.000Z') }); // 03:00 local
  assert.equal(sends, 0);
  assert.equal(night.skippedQuiet, 1);
  assert.equal(readSubByEndpoint(device.endpoint).last_notified_at, null);

  const morning = await push.runDailyJob({ now: new Date('2026-09-02T06:30:00.000Z') }); // 09:30 local
  assert.equal(morning.sent, 1);
  assert.equal(sends, 1);
});

// ── What counts as "due" ────────────────────────────────────────────────────

test('a device with nothing due is not notified', async () => {
  const device = await seedDueDevice({ dueCount: 0, nextDueAt: '2026-09-10T00:00:00.000Z' });
  let sends = 0;
  webpush.sendNotification = async () => { sends += 1; return { statusCode: 201 }; };

  const summary = await push.runDailyJob({ now: AT_10_UTC });

  assert.equal(sends, 0);
  assert.ok(summary.skippedNothingDue >= 1);
  assert.equal(readSubByEndpoint(device.endpoint).last_notified_at, null);
});

test('a card coming due later wakes the job without another sync from the client', async () => {
  // This is what makes the client's snapshot useful beyond the moment it was
  // taken: "nothing due now, next one at T" lets the server act at T on its
  // own. Without it, a user who does not open the app is never reminded to.
  const device = await seedDueDevice({ dueCount: 0, nextDueAt: '2026-09-04T05:00:00.000Z' });
  const payloads = [];
  webpush.sendNotification = async (_s, payload) => {
    payloads.push(JSON.parse(payload));
    return { statusCode: 201 };
  };

  const before = await push.runDailyJob({ now: new Date('2026-09-03T10:00:00.000Z') });
  assert.equal(before.sent, 0);

  const after = await push.runDailyJob({ now: new Date('2026-09-04T10:00:00.000Z') });
  assert.equal(after.sent, 1);
  // due_count is 0 but something IS due — the copy must not say "0 cards".
  assert.equal(payloads[0].dueCount, 1);
  assert.equal(payloads[0].kind, 'daily');
  assert.ok(readSubByEndpoint(device.endpoint).last_notified_at);
});

test('a device that has never reported SRS state is never sent a daily reminder', async () => {
  // The server has no evidence anything is due there. Guessing would mean
  // pushing "you have cards due" at someone who may have none.
  const { token } = await register();
  const endpoint = newEndpoint();
  await call('POST', '/api/push/subscribe', {
    body: { subscription: subscriptionBody(endpoint).subscription, tzOffsetMinutes: 0 },
    token,
  });
  assert.equal(readSubByEndpoint(endpoint).state_reported_at, null);

  let sends = 0;
  webpush.sendNotification = async () => { sends += 1; return { statusCode: 201 }; };
  await push.runDailyJob({ now: AT_10_UTC });

  assert.equal(sends, 0);
});

test('a snapshot older than the stale window stops producing reminders', async () => {
  // Otherwise an abandoned install is pushed at every single day forever, on a
  // due count nobody has confirmed in months.
  const device = await seedDueDevice();
  let sends = 0;
  webpush.sendNotification = async () => { sends += 1; return { statusCode: 201 }; };

  // 60 days after the snapshot was reported.
  const summary = await push.runDailyJob({ now: new Date(Date.now() + 60 * 86_400_000) });

  assert.equal(sends, 0);
  assert.equal(summary.considered, 0, 'a stale device was still a candidate');
  assert.ok(readSubByEndpoint(device.endpoint), 'the row should stay — only reminders stop');
});

// ── The cron trigger ────────────────────────────────────────────────────────

test('the trigger endpoint is closed to a signed-in non-admin', async () => {
  const { token } = await register();
  const res = await call('POST', '/api/push/run-daily', { body: {}, token });
  assert.equal(res.status, 403);
});

test('the trigger endpoint accepts a matching cron secret and rejects a wrong one', async () => {
  process.env.PUSH_CRON_SECRET = 'a-long-enough-cron-secret-value';
  try {
    let sends = 0;
    webpush.sendNotification = async () => { sends += 1; return { statusCode: 201 }; };
    await seedDueDevice();

    const wrong = await call('POST', '/api/push/run-daily', {
      body: {},
      headers: { 'X-Cron-Secret': 'a-long-enough-cron-secret-valuX' },
    });
    assert.equal(wrong.status, 401, 'a wrong secret got in');

    const short = await call('POST', '/api/push/run-daily', {
      body: {},
      headers: { 'X-Cron-Secret': 'short' },
    });
    assert.equal(short.status, 401, 'a length mismatch must not throw or pass');

    const ok = await call('POST', '/api/push/run-daily', {
      body: {},
      headers: { 'X-Cron-Secret': 'a-long-enough-cron-secret-value' },
    });
    assert.equal(ok.status, 200);
    assert.equal(ok.body.ok, true);
    assert.equal(typeof ok.body.considered, 'number');
  } finally {
    delete process.env.PUSH_CRON_SECRET;
  }
});

test('the trigger endpoint reports 503 rather than pretending to run when disabled', async () => {
  process.env.PUSH_CRON_SECRET = 'another-cron-secret-for-this-test';
  disablePush();
  try {
    const res = await call('POST', '/api/push/run-daily', {
      body: {},
      headers: { 'X-Cron-Secret': 'another-cron-secret-for-this-test' },
    });
    assert.equal(res.status, 503);
    assert.equal(res.body.code, 'push_disabled');
  } finally {
    delete process.env.PUSH_CRON_SECRET;
  }
});

// ── Health for the signed-in viewer ─────────────────────────────────────────

test('health lists the caller devices without leaking endpoints or keys', async () => {
  // The UI needs to say "reminders are on for 2 devices" — it must not need,
  // and must not receive, the material required to push to them.
  const { token } = await register();
  const endpoint = newEndpoint();
  await call('POST', '/api/push/subscribe', {
    body: subscriptionBody(endpoint, { dueCount: 5, tzOffsetMinutes: -180 }),
    token,
  });

  const res = await call('GET', '/api/push/health', { token });

  assert.equal(res.status, 200);
  assert.equal(res.body.devices.length, 1);
  assert.equal(res.body.devices[0].due_count, 5);
  assert.equal(res.body.devices[0].tz_offset_minutes, -180);
  assert.ok(!res.raw.includes(endpoint), 'health echoed a push endpoint');
  assert.ok(!res.raw.includes('p256dh'), 'health echoed an encryption key');
  assert.equal(res.body.sendHourLocal, 9);
  assert.equal(res.body.quietHourLocal, 22);
});

test('health has no devices array for an anonymous caller', async () => {
  const res = await call('GET', '/api/push/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.devices, undefined);
});
