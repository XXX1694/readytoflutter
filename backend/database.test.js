'use strict';

// Tests for the progress-merge path in database.js.
//
// bulkSetProgress is the highest-risk write in the backend: it merges a
// client's offline localStorage progress into SQLite with last-write-wins on
// `updated_at`. Getting the comparison backwards, dropping the user scope, or
// losing a row inside the transaction silently destroys study history, and
// nothing in the UI would surface it. Every test below names the specific
// destruction it guards against.
//
// Isolation: ONSITE_DATA_DIR (a test seam in database.js) points the SQLite
// file *and* the seed directory at a throwaway temp dir, so the developer's
// real backend/data/interview.db is never opened.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const BetterSqlite3 = require('better-sqlite3');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'onsite-db-test-'));
fs.cpSync(path.join(__dirname, 'data', 'seed'), path.join(tmpDir, 'seed'), { recursive: true });

process.env.ONSITE_DATA_DIR = tmpDir;
// A stray bootstrap email in the developer's shell would mutate rows mid-test.
delete process.env.ADMIN_BOOTSTRAP_EMAIL;

const db = require('./database');
db.init();

// Second, read-only connection: bulkSetProgress' result object is not enough
// evidence — we assert on the persisted row, including `updated_at`, which no
// exported reader returns.
const reader = new BetterSqlite3(path.join(tmpDir, 'interview.db'), { readonly: true });
const readRow = (userId, questionId) => reader
  .prepare('SELECT user_id, question_id, status, notes, updated_at FROM progress WHERE user_id = ? AND question_id = ?')
  .get(userId, questionId);
const readAll = (userId) => reader
  .prepare('SELECT question_id, status, notes, updated_at FROM progress WHERE user_id = ? ORDER BY question_id')
  .all(userId);

// A fresh user per test: no test can inherit another test's rows.
let userSeq = 0;
const newUser = () => db.createUser({
  email: `bulk-${Date.now()}-${userSeq++}@example.test`,
  passwordHash: 'not-a-real-hash',
  name: null,
});

// Real seeded question ids — progress rows point at questions(id).
const QIDS = db.getQuestions().slice(0, 5).map((q) => q.id);
assert.ok(QIDS.length === 5, 'seed must provide at least 5 questions for these tests');

const OLD = '2026-01-01T00:00:00.000Z';
const MID = '2026-06-01T00:00:00.000Z';
const NEW = '2026-12-01T00:00:00.000Z';

// ── AI grade quota reservation (wave 3) ──────────────────────────────────────
// Locks the atomic reserve/refund contract behind the concurrent-overrun fix:
// the count-check and the log insert happen in one transaction, so the cap can
// never be passed by a stale pre-count, and a failed grade refunds its slot.

test('reserveAiGrade allows exactly `cap` reservations, then refuses', () => {
  const ip = `10.0.0.${userSeq++}`;
  const cap = 3;
  const got = [];
  for (let i = 0; i < 5; i += 1) got.push(db.reserveAiGrade({ ip, cap }).reserved);
  assert.deepEqual(got, [true, true, true, false, false]);
  assert.equal(db.aiGradeCountLast24h({ ip }), 3, 'only the reserved rows are logged');
});

test('refundAiGrade returns a slot so a failed grade does not bill', () => {
  const ip = `10.0.1.${userSeq++}`;
  const cap = 1;
  const first = db.reserveAiGrade({ ip, cap });
  assert.equal(first.reserved, true);
  assert.equal(db.reserveAiGrade({ ip, cap }).reserved, false, 'cap reached');
  db.refundAiGrade(first.id);
  assert.equal(db.aiGradeCountLast24h({ ip }), 0, 'the refunded row is gone');
  assert.equal(db.reserveAiGrade({ ip, cap }).reserved, true, 'the slot is free again');
});

// ── Push once-per-day claim (wave 3) ─────────────────────────────────────────
// Locks the compare-and-set that stops two overlapping daily passes from both
// sending: only the caller holding the value it read wins the claim.

test('claimPushNotification is won by exactly one caller for a given prior value', () => {
  const user = newUser();
  db.upsertPushSubscription({
    userId: user.id,
    endpoint: `https://push.example/${userSeq++}`,
    p256dh: 'k', auth: 'a', tzOffsetMinutes: 0, dueCount: 3,
  });
  const sub = db.listPushSubscriptionsForUser(user.id)[0];
  assert.equal(sub.last_notified_at, null);

  const now1 = '2026-06-01T09:00:00.000Z';
  // Two overlapping passes both read last_notified_at = null.
  assert.equal(db.claimPushNotification(sub.id, now1, null), true, 'first caller wins');
  assert.equal(db.claimPushNotification(sub.id, now1, null), false, 'second caller, same prior value, loses');

  // The next day, the prior value is now1; a fresh claim on it wins again.
  const now2 = '2026-06-02T09:00:00.000Z';
  assert.equal(db.claimPushNotification(sub.id, now2, now1), true, 'a new day claims against the stored value');
  assert.equal(db.claimPushNotification(sub.id, now2, now1), false, 'and only once');
});

test.after(() => {
  reader.close();
  db.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('bulkSetProgress inserts a row when the user has no server-side progress yet', () => {
  const user = newUser();

  const result = db.bulkSetProgress(user.id, [
    { questionId: QIDS[0], status: 'completed', notes: 'from the plane', updated_at: MID },
  ]);

  assert.deepEqual(result, { imported: 1, skipped: 0 });
  assert.deepEqual(readRow(user.id, QIDS[0]), {
    user_id: user.id,
    question_id: QIDS[0],
    status: 'completed',
    notes: 'from the plane',
    updated_at: MID,
  });
});

test('bulkSetProgress applies a client row whose updated_at is newer than the server row', () => {
  const user = newUser();
  db.setProgress(user.id, QIDS[0], 'in_progress', 'server note', OLD);

  const result = db.bulkSetProgress(user.id, [
    { questionId: QIDS[0], status: 'completed', notes: 'client note', updated_at: NEW },
  ]);

  assert.deepEqual(result, { imported: 1, skipped: 0 });
  const row = readRow(user.id, QIDS[0]);
  assert.equal(row.status, 'completed');
  assert.equal(row.notes, 'client note');
  assert.equal(row.updated_at, NEW);
});

test('bulkSetProgress refuses a stale client row — a newer server row is never clobbered', () => {
  // The data-loss case: a phone that was offline for a week pushes progress
  // that predates work the user already did on the desktop. If the comparison
  // is inverted or dropped, the desktop's "completed" silently reverts.
  const user = newUser();
  db.setProgress(user.id, QIDS[0], 'completed', 'done on desktop', NEW);

  const result = db.bulkSetProgress(user.id, [
    { questionId: QIDS[0], status: 'not_started', notes: 'stale phone copy', updated_at: OLD },
  ]);

  assert.deepEqual(result, { imported: 0, skipped: 1 });
  const row = readRow(user.id, QIDS[0]);
  assert.equal(row.status, 'completed');
  assert.equal(row.notes, 'done on desktop');
  assert.equal(row.updated_at, NEW);
});

test('bulkSetProgress skips a client row whose updated_at ties the server row', () => {
  // Equal timestamps mean the two sides already agree; re-writing would churn
  // the row (and, if the tie-break flipped to "client wins", would let a
  // same-second stale client overwrite a server edit).
  const user = newUser();
  db.setProgress(user.id, QIDS[0], 'completed', 'server wins ties', MID);

  const result = db.bulkSetProgress(user.id, [
    { questionId: QIDS[0], status: 'not_started', notes: 'client', updated_at: MID },
  ]);

  assert.deepEqual(result, { imported: 0, skipped: 1 });
  const row = readRow(user.id, QIDS[0]);
  assert.equal(row.status, 'completed');
  assert.equal(row.notes, 'server wins ties');
});

test('bulkSetProgress resolves a mixed batch per-item instead of all-or-nothing', () => {
  // One insert, one win, one loss, one malformed item in a single call. A
  // transaction that aborted on the malformed item would drop the two good
  // writes; one that ignored per-item comparison would apply the stale one.
  const user = newUser();
  db.setProgress(user.id, QIDS[1], 'in_progress', null, OLD);   // will be overwritten
  db.setProgress(user.id, QIDS[2], 'completed', 'keep me', NEW); // must survive

  const result = db.bulkSetProgress(user.id, [
    { questionId: QIDS[0], status: 'completed', updated_at: MID },        // fresh insert
    { questionId: QIDS[1], status: 'completed', updated_at: NEW },        // newer, wins
    { questionId: QIDS[2], status: 'not_started', updated_at: OLD },      // older, loses
    { questionId: QIDS[3] },                                             // no status, skipped
  ]);

  assert.deepEqual(result, { imported: 2, skipped: 2 });
  assert.deepEqual(readAll(user.id), [
    { question_id: QIDS[0], status: 'completed', notes: null, updated_at: MID },
    { question_id: QIDS[1], status: 'completed', notes: null, updated_at: NEW },
    { question_id: QIDS[2], status: 'completed', notes: 'keep me', updated_at: NEW },
  ]);
});

test('bulkSetProgress treats an empty or non-array payload as a no-op', () => {
  const user = newUser();
  db.setProgress(user.id, QIDS[0], 'completed', 'untouched', MID);

  assert.deepEqual(db.bulkSetProgress(user.id, []), { imported: 0, skipped: 0 });
  assert.deepEqual(db.bulkSetProgress(user.id, null), { imported: 0, skipped: 0 });
  assert.deepEqual(db.bulkSetProgress(user.id, undefined), { imported: 0, skipped: 0 });

  assert.deepEqual(readAll(user.id), [
    { question_id: QIDS[0], status: 'completed', notes: 'untouched', updated_at: MID },
  ]);
});

test('bulkSetProgress writes only inside the given user scope', () => {
  // Every statement here is user-scoped; a missing `user_id` in the SELECT of
  // existing rows or in the upsert would leak one account's progress into
  // another's — the worst possible failure of this function.
  const alice = newUser();
  const bob = newUser();

  db.setProgress(bob.id, QIDS[0], 'completed', 'bob was here', OLD);
  db.setProgress(bob.id, QIDS[1], 'in_progress', null, NEW);

  const result = db.bulkSetProgress(alice.id, [
    { questionId: QIDS[0], status: 'not_started', notes: 'alice', updated_at: NEW },
    { questionId: QIDS[1], status: 'completed', notes: 'alice', updated_at: NEW },
  ]);

  assert.deepEqual(result, { imported: 2, skipped: 0 });
  assert.deepEqual(readAll(bob.id), [
    { question_id: QIDS[0], status: 'completed', notes: 'bob was here', updated_at: OLD },
    { question_id: QIDS[1], status: 'in_progress', notes: null, updated_at: NEW },
  ]);
  assert.equal(readAll(alice.id).length, 2);
  assert.equal(readRow(alice.id, QIDS[0]).notes, 'alice');
});

test('bulkSetProgress refuses to write when the user id is missing or zero', () => {
  // user_id 0 is the legacy pre-auth archive. Silently importing there would
  // dump a real user's progress into a bucket nothing ever reads back.
  const before = readAll(0).length;

  for (const badId of [0, undefined, null, '', 'abc', NaN]) {
    assert.throws(
      () => db.bulkSetProgress(badId, [{ questionId: QIDS[0], status: 'completed', updated_at: MID }]),
      /requires a real user id/,
    );
  }

  assert.equal(readAll(0).length, before);
});

test('bulkSetProgress accepts both the camelCase and snake_case client key spellings', () => {
  // The browser payload is built by serializeLocalProgress (questionId +
  // updated_at); older clients and direct API callers use question_id /
  // updatedAt. Dropping either spelling turns a real import into a silent
  // "skipped" with a 200 response.
  const user = newUser();

  const result = db.bulkSetProgress(user.id, [
    { question_id: QIDS[0], status: 'completed', updatedAt: MID },
    { questionId: QIDS[1], status: 'in_progress', updated_at: MID },
  ]);

  assert.deepEqual(result, { imported: 2, skipped: 0 });
  assert.equal(readRow(user.id, QIDS[0]).updated_at, MID);
  assert.equal(readRow(user.id, QIDS[1]).updated_at, MID);
});

test('bulkSetProgress skips malformed items instead of inserting a broken row', () => {
  const user = newUser();

  const result = db.bulkSetProgress(user.id, [
    { questionId: QIDS[0] },                       // no status
    { status: 'completed', updated_at: MID },       // no question id
    { questionId: 0, status: 'completed' },         // falsy question id
    { questionId: 'not-a-number', status: 'completed' },
    { questionId: QIDS[1], status: '', updated_at: MID }, // empty status
  ]);

  assert.deepEqual(result, { imported: 0, skipped: 5 });
  assert.deepEqual(readAll(user.id), []);
});

test('bulkSetProgress defaults a missing updated_at to now, so it wins over an older server row', () => {
  // Clients that never stored a timestamp must still be able to sync; the
  // server stamps the row rather than discarding the write.
  const user = newUser();
  db.setProgress(user.id, QIDS[0], 'not_started', null, OLD);

  const result = db.bulkSetProgress(user.id, [
    { questionId: QIDS[0], status: 'completed' },
  ]);

  assert.deepEqual(result, { imported: 1, skipped: 0 });
  const row = readRow(user.id, QIDS[0]);
  assert.equal(row.status, 'completed');
  assert.ok(row.updated_at > OLD, `expected a server-stamped timestamp, got ${row.updated_at}`);
  assert.ok(!Number.isNaN(Date.parse(row.updated_at)), 'stamped updated_at must be an ISO date');
});

test('bulkSetProgress clears notes when the winning client row has none', () => {
  // notes is `it.notes || null`: a client that deleted its note must not have
  // the server's old note resurrected under the new status.
  const user = newUser();
  db.setProgress(user.id, QIDS[0], 'in_progress', 'an old note', OLD);

  db.bulkSetProgress(user.id, [{ questionId: QIDS[0], status: 'completed', updated_at: NEW }]);

  assert.equal(readRow(user.id, QIDS[0]).notes, null);
});

test('bulkSetProgress resolves duplicate ids within one batch by updated_at, not array order', () => {
  // The public contract is "last write wins keyed on updated_at". The bulk
  // endpoint does not de-duplicate its payload, so a client that emits two
  // entries for one question must still end up with the newer one.
  const user = newUser();

  const result = db.bulkSetProgress(user.id, [
    { questionId: QIDS[0], status: 'completed', notes: 'newer', updated_at: NEW },
    { questionId: QIDS[0], status: 'not_started', notes: 'older', updated_at: OLD },
  ]);

  const row = readRow(user.id, QIDS[0]);
  assert.equal(row.status, 'completed', 'the older duplicate overwrote the newer one');
  assert.equal(row.notes, 'newer');
  assert.equal(row.updated_at, NEW);
  assert.deepEqual(result, { imported: 1, skipped: 1 });
});

test('resetProgress deletes only the calling user rows', () => {
  const alice = newUser();
  const bob = newUser();
  db.bulkSetProgress(alice.id, [{ questionId: QIDS[0], status: 'completed', updated_at: MID }]);
  db.bulkSetProgress(bob.id, [{ questionId: QIDS[0], status: 'completed', updated_at: MID }]);

  db.resetProgress(alice.id);

  assert.deepEqual(readAll(alice.id), []);
  assert.equal(readAll(bob.id).length, 1);
});

test('getStats counts only the requested user progress after a bulk import', () => {
  // The stats endpoint is how a user notices sync worked. Cross-user leakage
  // here would show one account another account's completion count.
  const alice = newUser();
  const bob = newUser();

  db.bulkSetProgress(alice.id, [
    { questionId: QIDS[0], status: 'completed', updated_at: MID },
    { questionId: QIDS[1], status: 'completed', updated_at: MID },
    { questionId: QIDS[2], status: 'in_progress', updated_at: MID },
  ]);
  db.bulkSetProgress(bob.id, [
    { questionId: QIDS[0], status: 'completed', updated_at: MID },
  ]);

  const stats = db.getStats(alice.id);
  assert.equal(stats.completed, 2);
  assert.equal(stats.inProgress, 1);
  assert.equal(db.getStats(bob.id).completed, 1);
  assert.ok(stats.totalQuestions > 0);
});
