'use strict';

// Boot-time migrations and the seed-content sync. Each of these broke a
// real deployment path at least once in review: a database that predates
// user-scoped progress could not boot (FK on the archive rows), two topics
// swapping slugs collided on the UNIQUE index half-way through the upsert,
// and a reverted content commit was silently ignored because the sync
// remembered every hash it had ever applied.
//
// Isolation: a throwaway ONSITE_DATA_DIR with a copy of the seed, exactly as
// database.test.js does. node --test runs this file in its own process, so the
// module-level database connection is ours alone.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const BetterSqlite3 = require('better-sqlite3');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'onsite-migrations-test-'));
const seedDir = path.join(tmpDir, 'seed');
fs.cpSync(path.join(__dirname, 'data', 'seed'), seedDir, { recursive: true });
process.env.ONSITE_DATA_DIR = tmpDir;
delete process.env.ADMIN_BOOTSTRAP_EMAIL;

// A database from before progress was user-scoped: the legacy table with a
// row in it, and nothing else. init() must migrate it rather than throw.
const dbFile = path.join(tmpDir, 'interview.db');
{
  const legacy = new BetterSqlite3(dbFile);
  legacy.exec(`
    CREATE TABLE progress (
      question_id INTEGER PRIMARY KEY,
      status TEXT NOT NULL,
      notes TEXT,
      updated_at TEXT NOT NULL
    );
    INSERT INTO progress (question_id, status, notes, updated_at)
      VALUES (1, 'completed', 'kept', '2025-01-01T00:00:00.000Z');

    -- And an srs_cards from the SM-2 scheduler: one "ease" column, no memory
    -- state. init() has to rebuild it for FSRS without moving a review date.
    CREATE TABLE srs_cards (
      user_id INTEGER NOT NULL,
      question_id INTEGER NOT NULL,
      ease REAL NOT NULL,
      interval INTEGER NOT NULL,
      reps INTEGER NOT NULL,
      due_at INTEGER NOT NULL,
      last_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, question_id)
    );
    INSERT INTO srs_cards (user_id, question_id, ease, interval, reps, due_at, last_at) VALUES
      (7, 1, 2.5, 45, 6, 1800000000000, 1790000000000),
      (7, 2, 1.3, 1, 0, 1780000000000, 1779000000000),
      (7, 3, 2.5, 0, 1, 0, 1779500000000);
  `);
  legacy.close();
}

const db = require('./database');

const topicsFile = path.join(seedDir, 'topics.json');
const readTopics = () => JSON.parse(fs.readFileSync(topicsFile, 'utf8'));
const writeTopics = (topics) => fs.writeFileSync(topicsFile, JSON.stringify(topics, null, 2) + '\n');
const questionFile = path.join(seedDir, 'questions', '01-dart-basics.json');
const readQuestions = () => JSON.parse(fs.readFileSync(questionFile, 'utf8'));
const writeQuestions = (questions) => fs.writeFileSync(questionFile, JSON.stringify(questions, null, 2) + '\n');

const reader = () => new BetterSqlite3(dbFile, { readonly: true });

test('a pre-auth database with progress rows boots and keeps them as the user-0 archive', () => {
  assert.doesNotThrow(() => db.init());
  const r = reader();
  const cols = r.prepare('PRAGMA table_info(progress)').all().map((c) => c.name);
  assert.ok(cols.includes('user_id'), 'progress is user-scoped after init');
  const row = r.prepare('SELECT user_id, status, notes FROM progress WHERE question_id = 1').get();
  assert.deepEqual(row, { user_id: 0, status: 'completed', notes: 'kept' });
  assert.equal(r.pragma('foreign_keys', { simple: true }), 1, 'foreign keys are back on after the migration');
  r.close();
});

test('anonymous reads never surface the user-0 archive as the anon baseline', () => {
  // The row above (question_id 1, user_id 0, completed) is exactly what a
  // pre-auth migration parks in the archive. An unauthenticated read defaults
  // userId to "no user" and must join no progress — reading the archive as the
  // anonymous baseline was a leak on any migrated instance.
  db.init();
  assert.equal(db.getStats().completed, 0, 'getStats() (anon) counts no archive completion');
  assert.equal(db.getStats(0).completed, 0, 'an explicit 0 does not reach the archive either');
  const q1 = db.getQuestions().find((q) => q.id === 1);
  assert.equal(q1.status, 'not_started', 'getQuestions() (anon) shows the archive question as not started');
  const topic = db.getTopic(db.getTopics()[0].slug);
  assert.equal(topic.completed_count, 0, 'getTopic() (anon) counts no archive completion');
  // The archive row itself is untouched — a real (future) user 0 does not exist,
  // and a genuinely signed-in user still sees their own progress.
  const archive = reader();
  assert.ok(archive.prepare('SELECT 1 FROM progress WHERE user_id = 0 AND question_id = 1').get(),
    'the archive row is preserved, just never read anonymously');
  archive.close();
});

test('two topics swapping slugs sync without tripping the UNIQUE index', () => {
  const topics = readTopics();
  const a = topics.find((t) => t.id === 1);
  const b = topics.find((t) => t.id === 2);
  [a.slug, b.slug] = [b.slug, a.slug];
  writeTopics(topics);
  assert.doesNotThrow(() => db.init());
  assert.equal(db.getTopic(a.slug).id, 1);
  assert.equal(db.getTopic(b.slug).id, 2);
});

test('reverting a content edit is applied, not remembered as already seen', () => {
  const original = readQuestions();
  const edited = readQuestions();
  edited[0].answer = 'BAD CONTENT EDIT';
  writeQuestions(edited);
  db.init();
  assert.equal(db.getTopic('oop-dart') && db.getQuestions().find((q) => q.id === edited[0].id).answer, 'BAD CONTENT EDIT');

  writeQuestions(original);
  db.init();
  assert.equal(db.getQuestions().find((q) => q.id === original[0].id).answer, original[0].answer);
});

test('a question dropped from the seed disappears from the API with its progress', () => {
  const questions = readQuestions();
  const gone = questions.pop();
  writeQuestions(questions);
  const r = reader();
  assert.ok(r.prepare('SELECT 1 FROM questions WHERE id = ?').get(gone.id), 'present before the sync');
  r.close();
  db.init();
  assert.equal(db.questionExists(gone.id), false);
  writeQuestions([...questions, gone]);
  db.init();
  assert.equal(db.questionExists(gone.id), true);
});

test('a bulk import skips a question that has left the catalogue instead of failing the batch', () => {
  const user = db.createUser({ email: 'migrations@example.test', passwordHash: 'x', name: null });
  const result = db.bulkSetProgress(user.id, [
    { questionId: 1, status: 'completed', updated_at: '2026-01-01T00:00:00.000Z' },
    { questionId: 999999, status: 'completed', updated_at: '2026-01-01T00:00:00.000Z' },
  ]);
  assert.deepEqual(result, { imported: 1, skipped: 1 });
});

test.after(() => {
  db.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('an SM-2 srs_cards is rebuilt for FSRS without moving a single review date', () => {
  // The scheduler switch must be invisible to anyone mid-schedule. `interval`
  // is the same quantity under both — days until the card is asked again — so
  // it carries across as stability and due_at is left exactly where it was.
  db.init();
  const r = reader();
  const cols = r.prepare('PRAGMA table_info(srs_cards)').all().map((c) => c.name);
  assert.ok(cols.includes('stability'), 'srs_cards has FSRS memory state');
  assert.ok(cols.includes('difficulty'));
  assert.ok(!cols.includes('ease'), 'the SM-2 column is gone');

  const rows = r.prepare('SELECT * FROM srs_cards WHERE user_id = 7 ORDER BY question_id').all();
  assert.equal(rows.length, 3, 'every card survived the rebuild');

  const [mature, struggling, noInterval] = rows;
  assert.equal(mature.stability, 45, 'the earned interval becomes stability');
  assert.equal(mature.interval, 45);
  assert.equal(mature.due_at, 1800000000000, 'the next review did not move');
  assert.equal(mature.reps, 6);

  // Ease maps monotonically onto difficulty: the 1.3 card is the harder one.
  assert.ok(struggling.difficulty > mature.difficulty);
  for (const row of rows) {
    assert.ok(row.difficulty >= 1 && row.difficulty <= 10, `difficulty in range: ${row.difficulty}`);
    assert.ok(row.stability > 0, `stability is usable: ${row.stability}`);
  }
  // A rated card with no interval still needs a stability to schedule from.
  assert.ok(noInterval.stability > 0);
  r.close();
});

test('the FSRS rebuild is idempotent across reboots', () => {
  db.init();
  db.init();
  const r = reader();
  const rows = r.prepare('SELECT * FROM srs_cards WHERE user_id = 7').all();
  assert.equal(rows.length, 3);
  assert.equal(rows.find((x) => x.question_id === 1).stability, 45);
  r.close();
});
