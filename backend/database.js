
const fs = require('fs');
const path = require('path');
const BetterSqlite3 = require('better-sqlite3');

// Test seam: point the whole data directory (SQLite file + seed JSON) at a
// throwaway dir so `node --test` never touches the real backend/data/interview.db.
const DATA_DIR = process.env.ONSITE_DATA_DIR
  ? path.resolve(process.env.ONSITE_DATA_DIR)
  : path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'interview.db');
const SEED_DIR = path.join(DATA_DIR, 'seed');
const SEED_TOPICS_FILE = path.join(SEED_DIR, 'topics.json');
const SEED_QUESTIONS_DIR = path.join(SEED_DIR, 'questions');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const sqlite = new BetterSqlite3(DB_FILE);
// Wait on a held write lock instead of erroring out immediately — a maintenance
// script, a test, or a backup reader touching the file while the server writes
// no longer throws SQLITE_BUSY. Set before any other pragma so it covers them.
sqlite.pragma('busy_timeout = 5000');
sqlite.pragma('journal_mode = WAL');

function normalizeQuestionAnswer(question, answer) {
  let normalizedQuestion = (question || '').trim();
  let normalizedAnswer = (answer || '').trim();

  // Convert scenario-style prompts into direct interview questions.
  normalizedQuestion = normalizedQuestion
    .replace(/^Interview scenario\s*#\d+:\s*/i, '')
    .replace(/^Scenario\s*\d+:\s*/i, '')
    .replace(/^How would you handle\s+/i, 'How do you handle ')
    .replace(/^How would you approach\s+/i, 'How do you approach ')
    .trim();

  const genericApproachMatch = normalizedQuestion.match(
    /^How do you approach\s+(.+?)\s+for this topic\?$/i,
  );
  if (genericApproachMatch) {
    const focus = genericApproachMatch[1].trim();
    normalizedQuestion = `How do you approach ${focus} in Flutter apps?`;

    if (
      /^Explain assumptions, constraints, measurable goals, and rollback\./i.test(
        normalizedAnswer,
      )
    ) {
      normalizedAnswer = [
        `A strong approach to ${focus} is: define clear goals first, design a small safe implementation, validate with tests and metrics, then ship gradually.`,
        'Start by documenting assumptions, constraints, and acceptance criteria so the team agrees on what success means.',
        'Implement in small increments, add monitoring (logs, analytics, error tracking), and verify behavior in both happy and failure paths.',
        'Finally, release behind a flag or phased rollout and keep a rollback plan if production signals degrade.',
      ].join('\n\n');
    }
  }

  // Remove scenario framing from answers.
  normalizedAnswer = normalizedAnswer
    .replace(
      /\n\nFocus area:\s*[\s\S]*?In interviews, explain trade-offs, failure modes, and how you would validate the result in production\.?/i,
      '',
    )
    .replace(/\bIn interviews,\s*/gi, '')
    .trim();

  return {
    question: normalizedQuestion,
    answer: normalizedAnswer,
  };
}

function normalizeExistingQuestions() {
  const rows = sqlite.prepare('SELECT id, question, answer FROM questions').all();
  const updateQuestion = sqlite.prepare(`
    UPDATE questions
    SET question = @question, answer = @answer
    WHERE id = @id
  `);

  const tx = sqlite.transaction(() => {
    rows.forEach(row => {
      const normalized = normalizeQuestionAnswer(row.question, row.answer);
      if (normalized.question !== row.question || normalized.answer !== row.answer) {
        updateQuestion.run({
          id: row.id,
          question: normalized.question,
          answer: normalized.answer,
        });
      }
    });
  });

  tx();
}

function removeGeneralQuestions() {
  // After the user_id migration we still want to clean orphan progress for
  // deleted questions, regardless of which user it belonged to.
  const deleteProgress = sqlite.prepare(`
    DELETE FROM progress
    WHERE question_id IN (
      SELECT id FROM questions WHERE order_index >= 100
    )
  `);

  const deleteQuestions = sqlite.prepare(`
    DELETE FROM questions
    WHERE order_index >= 100
  `);

  const tx = sqlite.transaction(() => {
    deleteProgress.run();
    deleteQuestions.run();
  });

  tx();
}

function init() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS topics (
      id INTEGER PRIMARY KEY,
      title TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      level TEXT NOT NULL,
      category TEXT,
      description TEXT,
      icon TEXT,
      order_index INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY,
      topic_id INTEGER NOT NULL,
      order_index INTEGER NOT NULL,
      difficulty TEXT NOT NULL,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      code_example TEXT,
      code_language TEXT DEFAULT 'dart',
      FOREIGN KEY (topic_id) REFERENCES topics(id)
    );

    CREATE TABLE IF NOT EXISTS progress (
      question_id INTEGER PRIMARY KEY,
      status TEXT NOT NULL,
      notes TEXT,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (question_id) REFERENCES questions(id)
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS contact_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      name TEXT,
      email TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      ip TEXT,
      created_at TEXT NOT NULL,
      resolved_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS ai_grade_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      ip TEXT,
      created_at TEXT NOT NULL
    );

    -- Web Push subscriptions, one row per browser (see push.js).
    --
    -- endpoint is UNIQUE because it identifies the browser, not the session:
    -- re-subscribing the same device must upsert this row rather than pile up
    -- duplicates that would each get their own copy of every notification.
    --
    -- due_count / next_due_at / state_reported_at are the browser's own SRS
    -- snapshot, reported by the client — SM-2 state lives in localStorage, so
    -- the server cannot compute it. Stored per-subscription rather than
    -- per-user because localStorage is per-browser, exactly like the
    -- subscription itself.
    --
    -- last_notified_at is the once-per-day guard. It is in SQLite and not in
    -- process memory specifically so a restart cannot re-send today's push.
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      endpoint TEXT NOT NULL UNIQUE,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      tz_offset_minutes INTEGER NOT NULL DEFAULT 0,
      due_count INTEGER NOT NULL DEFAULT 0,
      next_due_at TEXT,
      state_reported_at TEXT,
      last_notified_at TEXT,
      created_at TEXT NOT NULL,
      last_seen_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_topics_level ON topics(level);
    CREATE INDEX IF NOT EXISTS idx_topics_order ON topics(order_index);
    CREATE INDEX IF NOT EXISTS idx_questions_topic ON questions(topic_id);
    CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions(difficulty);
    CREATE INDEX IF NOT EXISTS idx_questions_order ON questions(order_index);
    CREATE INDEX IF NOT EXISTS idx_progress_status ON progress(status);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_contact_status ON contact_messages(status);
    CREATE INDEX IF NOT EXISTS idx_contact_created ON contact_messages(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_ai_grade_user_time ON ai_grade_log(user_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_ai_grade_ip_time ON ai_grade_log(ip, created_at);
    CREATE INDEX IF NOT EXISTS idx_push_subs_user ON push_subscriptions(user_id);
    CREATE INDEX IF NOT EXISTS idx_push_subs_reported ON push_subscriptions(state_reported_at);
  `);

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      name TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);

  migrateProgressToUserScoped();
  migrateUsersBilling();
  migrateUsersRecovery();
  migrateUsersTokenEpoch();
  seedIfEmpty();
  syncSeedContent();
  bootstrapAdminFromEnv();
  runOnce('remove_general_questions', removeGeneralQuestions);
  runOnce('normalize_existing_questions', normalizeExistingQuestions);
  runOnce('strip_topic_icons', stripTopicIcons);
  runOnce('drop_known_duplicates', dropKnownDuplicates);
}

// Idempotent: extends `users` with admin + Stripe billing columns. Each
// ALTER is guarded by a column check so the migration is safe to re-run on
// a DB that already has some of the columns.
function migrateUsersBilling() {
  const cols = sqlite.prepare('PRAGMA table_info(users)').all().map((c) => c.name);
  const adds = [
    ['is_admin', 'INTEGER NOT NULL DEFAULT 0'],
    ['pro_tier', "TEXT NOT NULL DEFAULT 'free'"],
    ['pro_expires_at', 'TEXT'],
    ['stripe_customer_id', 'TEXT'],
    ['stripe_subscription_id', 'TEXT'],
  ];
  for (const [name, type] of adds) {
    if (!cols.includes(name)) {
      sqlite.exec(`ALTER TABLE users ADD COLUMN ${name} ${type}`);
    }
  }
}

// Idempotent: extends `users` with the account-recovery columns. The code
// itself is never stored — only a bcrypt hash of it, exactly like a password,
// because a stored recovery code is a second password sitting in the clear.
function migrateUsersRecovery() {
  const cols = sqlite.prepare('PRAGMA table_info(users)').all().map((c) => c.name);
  const adds = [
    ['recovery_code_hash', 'TEXT'],
    ['recovery_code_set_at', 'TEXT'],
  ];
  for (const [name, type] of adds) {
    if (!cols.includes(name)) {
      sqlite.exec(`ALTER TABLE users ADD COLUMN ${name} ${type}`);
    }
  }
}

// Idempotent: the per-account token epoch. Signed into every JWT and bumped
// on a password or email change, so tokens from before the change stop
// verifying. Defaults to 0, which is also what a token with no claim reads
// as — nobody is signed out by the column appearing.
function migrateUsersTokenEpoch() {
  const cols = sqlite.prepare('PRAGMA table_info(users)').all().map((c) => c.name);
  if (!cols.includes('token_epoch')) {
    sqlite.exec('ALTER TABLE users ADD COLUMN token_epoch INTEGER NOT NULL DEFAULT 0');
  }
}

/**
 * Store a new recovery-code hash, replacing any previous one. Codes are
 * single-use: consuming one immediately issues its replacement, so there is
 * never more than one live code per account.
 */
function setRecoveryCode(userId, hash) {
  const now = new Date().toISOString();
  sqlite
    .prepare('UPDATE users SET recovery_code_hash = ?, recovery_code_set_at = ?, updated_at = ? WHERE id = ?')
    .run(hash, now, now, userId);
}

// Promote a single email to admin on boot when ADMIN_BOOTSTRAP_EMAIL is set.
// Used to seed the very first admin without writing SQL by hand. Safe to
// re-run: idempotent UPDATE that only touches matching rows.
function bootstrapAdminFromEnv() {
  const email = (process.env.ADMIN_BOOTSTRAP_EMAIL || '').trim().toLowerCase();
  if (!email) return;
  const result = sqlite
    .prepare('UPDATE users SET is_admin = 1 WHERE email = ?')
    .run(email);
  if (result.changes > 0) {
    console.log(`👑 Promoted ${email} to admin via ADMIN_BOOTSTRAP_EMAIL`);
  }
}

function runOnce(name, fn) {
  const row = sqlite.prepare('SELECT 1 FROM migrations WHERE name = ?').get(name);
  if (row) return;
  // One transaction for the work and its marker: a crash between the two
  // would otherwise re-run the migration on the next boot.
  sqlite.transaction(() => {
    fn();
    sqlite
      .prepare('INSERT INTO migrations (name, applied_at) VALUES (?, ?)')
      .run(name, new Date().toISOString());
  })();
}

// Idempotent: progress used `question_id` as PK; with auth each user gets a
// row per question. New PK is (user_id, question_id), and any pre-existing
// rows are preserved under user_id = 0 (legacy archive, effectively
// unreachable but kept rather than dropped).
function migrateProgressToUserScoped() {
  const cols = sqlite.prepare("PRAGMA table_info(progress)").all();
  const hasUserId = cols.some((c) => c.name === 'user_id');
  if (hasUserId) return;

  // The archive rows carry user_id = 0 and no such user exists, so the copy
  // would trip the FK the new table declares. better-sqlite3 enforces
  // foreign keys by default; switch them off for this one migration (the
  // pragma is a no-op inside a transaction, so it sits outside it).
  sqlite.pragma('foreign_keys = OFF');
  const tx = sqlite.transaction(() => {
    sqlite.exec(`
      CREATE TABLE progress_v2 (
        user_id INTEGER NOT NULL DEFAULT 0,
        question_id INTEGER NOT NULL,
        status TEXT NOT NULL,
        notes TEXT,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (user_id, question_id),
        FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      INSERT INTO progress_v2 (user_id, question_id, status, notes, updated_at)
        SELECT 0, question_id, status, notes, updated_at FROM progress;
      DROP TABLE progress;
      ALTER TABLE progress_v2 RENAME TO progress;
      CREATE INDEX idx_progress_user ON progress(user_id);
      CREATE INDEX idx_progress_status ON progress(status);
    `);
  });
  try {
    tx();
  } finally {
    sqlite.pragma('foreign_keys = ON');
  }
}

// Idempotent: clears legacy emoji icons. Safe to run on every boot.
function stripTopicIcons() {
  sqlite.prepare("UPDATE topics SET icon = '' WHERE icon IS NOT NULL AND icon != ''").run();
}

// Drop intra-topic duplicate questions that crept in during seed authoring.
// Listed by id so the migration is precise and idempotent.
const KNOWN_DUPLICATE_IDS = [67, 70];
function dropKnownDuplicates() {
  const tx = sqlite.transaction(() => {
    for (const id of KNOWN_DUPLICATE_IDS) {
      sqlite.prepare('DELETE FROM progress WHERE question_id = ?').run(id);
      sqlite.prepare('DELETE FROM questions WHERE id = ?').run(id);
    }
  });
  tx();
}

function readSeedData() {
  if (!fs.existsSync(SEED_TOPICS_FILE)) {
    throw new Error(`Missing seed topics file: ${SEED_TOPICS_FILE}`);
  }
  if (!fs.existsSync(SEED_QUESTIONS_DIR)) {
    throw new Error(`Missing seed questions directory: ${SEED_QUESTIONS_DIR}`);
  }

  const topics = JSON.parse(fs.readFileSync(SEED_TOPICS_FILE, 'utf8'));
  const questionFiles = fs
    .readdirSync(SEED_QUESTIONS_DIR)
    .filter(name => name.endsWith('.json'))
    .sort();

  const questions = questionFiles.flatMap(fileName => {
    const filePath = path.join(SEED_QUESTIONS_DIR, fileName);
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  });

  return { topics, questions };
}

function seedIfEmpty() {
  const count = sqlite.prepare('SELECT COUNT(*) AS count FROM topics').get().count;
  if (count > 0) return;

  const { topics, questions } = readSeedData();

  const insertTopic = sqlite.prepare(`
    INSERT INTO topics (id, title, slug, level, category, description, icon, order_index)
    VALUES (@id, @title, @slug, @level, @category, @description, @icon, @order_index)
  `);

  const insertQuestion = sqlite.prepare(`
    INSERT INTO questions (id, topic_id, order_index, difficulty, question, answer, code_example, code_language)
    VALUES (@id, @topic_id, @order_index, @difficulty, @question, @answer, @code_example, @code_language)
  `);

  const tx = sqlite.transaction(() => {
    topics.forEach(topic => insertTopic.run(topic));
    questions
      .filter(question => question.order_index < 100 && !KNOWN_DUPLICATE_IDS.includes(question.id))
      .forEach(question =>
      insertQuestion.run({
        ...question,
        ...normalizeQuestionAnswer(question.question, question.answer),
        code_language: question.code_language || 'dart',
      }),
    );
  });

  tx();
}

// The seed is the single source of question text (CLAUDE.md). `seedIfEmpty`
// only fills an empty database, so a deployed instance kept whatever wording
// it was first seeded with. This brings topics and questions in line with the
// seed whenever the seed files change: rows are upserted, rows the seed no
// longer has are deleted (their progress goes with them), and the current
// content hash is stored in `meta` so a normal boot does no work — and so
// reverting a bad content commit is applied like any other change.
function syncSeedContent() {
  const crypto = require('crypto');
  const { topics, questions } = readSeedData();
  const live = questions.filter((question) => question.order_index < 100 && !KNOWN_DUPLICATE_IDS.includes(question.id));
  const hash = crypto
    .createHash('sha256')
    .update(JSON.stringify({ topics, questions: live }))
    .digest('hex')
    .slice(0, 16);

  sqlite.exec('CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)');
  const current = sqlite.prepare("SELECT value FROM meta WHERE key = 'seed_content_hash'").get();
  if (current?.value === hash) return;

  const upsertTopic = sqlite.prepare(`
    INSERT INTO topics (id, title, slug, level, category, description, icon, order_index)
    VALUES (@id, @title, @slug, @level, @category, @description, '', @order_index)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title, slug = excluded.slug, level = excluded.level,
      category = excluded.category, description = excluded.description,
      icon = '', order_index = excluded.order_index
  `);
  const upsertQuestion = sqlite.prepare(`
    INSERT INTO questions (id, topic_id, order_index, difficulty, question, answer, code_example, code_language)
    VALUES (@id, @topic_id, @order_index, @difficulty, @question, @answer, @code_example, @code_language)
    ON CONFLICT(id) DO UPDATE SET
      topic_id = excluded.topic_id, order_index = excluded.order_index,
      difficulty = excluded.difficulty, question = excluded.question,
      answer = excluded.answer, code_example = excluded.code_example,
      code_language = excluded.code_language
  `);

  const tx = sqlite.transaction(() => {
    // Slugs are UNIQUE on their own, so two topics swapping slugs would
    // collide half-way through the upsert loop. Park every slug first.
    sqlite.prepare("UPDATE topics SET slug = 'pending:' || id").run();
    topics.forEach((topic) => upsertTopic.run(topic));
    live.forEach((question) =>
      upsertQuestion.run({
        ...question,
        ...normalizeQuestionAnswer(question.question, question.answer),
        code_example: question.code_example ?? null,
        code_language: question.code_language || 'dart',
      }),
    );

    // Rows the seed no longer carries. Questions first (progress cascades),
    // then topics that own nothing any more.
    const keepQuestions = new Set(live.map((q) => q.id));
    const keepTopics = new Set(topics.map((t) => t.id));
    for (const row of sqlite.prepare('SELECT id FROM questions').all()) {
      if (!keepQuestions.has(row.id)) {
        sqlite.prepare('DELETE FROM progress WHERE question_id = ?').run(row.id);
        sqlite.prepare('DELETE FROM questions WHERE id = ?').run(row.id);
      }
    }
    for (const row of sqlite.prepare('SELECT id FROM topics').all()) {
      if (!keepTopics.has(row.id)) sqlite.prepare('DELETE FROM topics WHERE id = ?').run(row.id);
    }

    sqlite
      .prepare("INSERT INTO meta (key, value) VALUES ('seed_content_hash', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
      .run(hash);
  });
  tx();
  console.log(`Seed content synced (${topics.length} topics, ${live.length} questions, ${hash})`);
}

// All read functions take a `userId` (default 0 = anonymous, no progress
// joined). Progress writes always require a real user id.
// Anonymous reads must join no progress. Real user ids start at 1 and the
// pre-auth archive sits at user_id 0, so mapping an absent / zero / invalid
// caller to 0 read the archive as the anonymous baseline — a leak. -1 matches
// no row on either side.
const readerUid = (userId) => {
  const n = Number(userId);
  return Number.isInteger(n) && n > 0 ? n : -1;
};

function getTopics(level, userId = -1) {
  let sql = `
    SELECT
      t.*,
      COUNT(DISTINCT q.id) AS question_count,
      SUM(CASE WHEN p.status = 'completed' THEN 1 ELSE 0 END) AS completed_count
    FROM topics t
    LEFT JOIN questions q ON q.topic_id = t.id
    LEFT JOIN progress p ON p.question_id = q.id AND p.user_id = @userId
  `;

  const params = { userId: readerUid(userId) };
  if (level) {
    sql += ' WHERE t.level = @level';
    params.level = level;
  }

  sql += ' GROUP BY t.id ORDER BY t.order_index ASC';

  return sqlite.prepare(sql).all(params);
}

function getTopic(slug, userId = -1) {
  const topic = sqlite.prepare('SELECT * FROM topics WHERE slug = ?').get(slug);
  if (!topic) return null;

  const questions = sqlite
    .prepare(`
      SELECT
        q.*,
        COALESCE(p.status, 'not_started') AS status,
        p.notes
      FROM questions q
      LEFT JOIN progress p ON p.question_id = q.id AND p.user_id = @userId
      WHERE q.topic_id = @topicId
      ORDER BY q.order_index ASC
    `)
    .all({ topicId: topic.id, userId: readerUid(userId) });

  const completedCount = questions.filter((q) => q.status === 'completed').length;

  return {
    ...topic,
    question_count: questions.length,
    completed_count: completedCount,
    questions,
  };
}

function getQuestions({ level, difficulty, search } = {}, userId = -1) {
  const conditions = [];
  const params = { userId: readerUid(userId) };

  if (level) {
    conditions.push('t.level = @level');
    params.level = level;
  }

  if (difficulty) {
    conditions.push('q.difficulty = @difficulty');
    params.difficulty = difficulty;
  }

  if (search) {
    conditions.push('(LOWER(q.question) LIKE LOWER(@search) OR LOWER(q.answer) LIKE LOWER(@search))');
    params.search = `%${search}%`;
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  return sqlite
    .prepare(`
      SELECT
        q.*,
        t.title AS topic_title,
        t.level,
        t.slug AS topic_slug,
        COALESCE(p.status, 'not_started') AS status,
        p.notes
      FROM questions q
      JOIN topics t ON t.id = q.topic_id
      LEFT JOIN progress p ON p.question_id = q.id AND p.user_id = @userId
      ${whereClause}
      ORDER BY t.order_index ASC, q.order_index ASC
    `)
    .all(params);
}

function setProgress(userId, questionId, status, notes, updatedAt) {
  const uid = Number(userId);
  if (!uid) throw new Error('setProgress requires a real user id');
  const now = updatedAt || new Date().toISOString();

  sqlite
    .prepare(`
      INSERT INTO progress (user_id, question_id, status, notes, updated_at)
      VALUES (@user_id, @question_id, @status, @notes, @updated_at)
      ON CONFLICT(user_id, question_id) DO UPDATE SET
        status = excluded.status,
        notes = excluded.notes,
        updated_at = excluded.updated_at
    `)
    .run({
      user_id: uid,
      question_id: Number(questionId),
      status,
      notes: notes || null,
      updated_at: now,
    });

  return { status, notes: notes || null, updated_at: now };
}

// Bulk import — used by the frontend the first time a user logs in to push
// their localStorage-stored progress to the server in a single round trip.
// "Last write wins" per (user_id, question_id), keyed on updated_at when
// supplied so we don't clobber a server row that's already newer.
function bulkSetProgress(userId, items) {
  const uid = Number(userId);
  if (!uid) throw new Error('bulkSetProgress requires a real user id');
  if (!Array.isArray(items) || items.length === 0) return { imported: 0, skipped: 0 };

  const existing = sqlite
    .prepare('SELECT question_id, updated_at FROM progress WHERE user_id = ?')
    .all(uid);
  const existingMap = new Map(existing.map((r) => [r.question_id, r.updated_at]));

  let imported = 0;
  let skipped = 0;

  const upsert = sqlite.prepare(`
    INSERT INTO progress (user_id, question_id, status, notes, updated_at)
    VALUES (@user_id, @question_id, @status, @notes, @updated_at)
    ON CONFLICT(user_id, question_id) DO UPDATE SET
      status = excluded.status,
      notes = excluded.notes,
      updated_at = excluded.updated_at
  `);

  const tx = sqlite.transaction(() => {
    for (const it of items) {
      const qid = Number(it.questionId ?? it.question_id);
      // A question that has since left the catalogue (the browser keeps
      // anonymous progress indefinitely) must not fail the whole batch.
      if (!qid || !it.status || !questionExists(qid)) { skipped += 1; continue; }
      const incomingAt = it.updated_at || it.updatedAt || new Date().toISOString();
      const serverAt = existingMap.get(qid);
      if (serverAt && serverAt >= incomingAt) { skipped += 1; continue; }
      upsert.run({
        user_id: uid,
        question_id: qid,
        status: it.status,
        notes: it.notes || null,
        updated_at: incomingAt,
      });
      // Track what we just wrote: the payload is not de-duplicated, so a
      // second item for the same question must be compared against this
      // write, not against the pre-batch snapshot. Without this a stale
      // duplicate later in the array reverts the newer one.
      existingMap.set(qid, incomingAt);
      imported += 1;
    }
  });
  tx();

  return { imported, skipped };
}

function getStats(userId = -1) {
  const uid = readerUid(userId);
  const totalQuestions = sqlite.prepare('SELECT COUNT(*) AS count FROM questions').get().count;
  const completed = sqlite
    .prepare("SELECT COUNT(*) AS count FROM progress WHERE status = 'completed' AND user_id = ?")
    .get(uid).count;
  const inProgress = sqlite
    .prepare("SELECT COUNT(*) AS count FROM progress WHERE status = 'in_progress' AND user_id = ?")
    .get(uid).count;

  const byLevel = sqlite
    .prepare(`
      SELECT t.level AS level, COUNT(q.id) AS count
      FROM topics t
      LEFT JOIN questions q ON q.topic_id = t.id
      GROUP BY t.level
      ORDER BY CASE t.level
        WHEN 'junior' THEN 1
        WHEN 'mid' THEN 2
        WHEN 'senior' THEN 3
        ELSE 4
      END
    `)
    .all();

  return { totalQuestions, completed, inProgress, byLevel };
}

function resetProgress(userId) {
  const uid = Number(userId);
  if (!uid) throw new Error('resetProgress requires a real user id');
  sqlite.prepare('DELETE FROM progress WHERE user_id = ?').run(uid);
}

// ── Users ────────────────────────────────────────────────────────────────────

function createUser({ email, passwordHash, name }) {
  const now = new Date().toISOString();
  const info = sqlite
    .prepare(`
      INSERT INTO users (email, password_hash, name, created_at, updated_at)
      VALUES (@email, @password_hash, @name, @created_at, @updated_at)
    `)
    .run({
      email: email.trim().toLowerCase(),
      password_hash: passwordHash,
      name: name || null,
      created_at: now,
      updated_at: now,
    });
  return getUserById(info.lastInsertRowid);
}

function getUserByEmail(email) {
  return sqlite
    .prepare('SELECT * FROM users WHERE email = ?')
    .get(String(email || '').trim().toLowerCase());
}

function getUserById(id) {
  return sqlite.prepare('SELECT * FROM users WHERE id = ?').get(Number(id));
}

function updateUserName(id, name) {
  const now = new Date().toISOString();
  sqlite
    .prepare('UPDATE users SET name = ?, updated_at = ? WHERE id = ?')
    .run(name || null, now, Number(id));
  return getUserById(id);
}

// Both credential changes bump the token epoch: every session but the one
// that receives the fresh token is signed out.
function updateUserPassword(id, passwordHash) {
  const now = new Date().toISOString();
  sqlite
    .prepare('UPDATE users SET password_hash = ?, token_epoch = token_epoch + 1, updated_at = ? WHERE id = ?')
    .run(passwordHash, now, Number(id));
  return getUserById(id);
}

function updateUserEmail(id, email) {
  const now = new Date().toISOString();
  sqlite
    .prepare('UPDATE users SET email = ?, token_epoch = token_epoch + 1, updated_at = ? WHERE id = ?')
    .run(String(email).trim().toLowerCase(), now, Number(id));
  return getUserById(id);
}

function deleteUser(id) {
  // Progress rows cascade on FK ON DELETE CASCADE.
  sqlite.prepare('DELETE FROM progress WHERE user_id = ?').run(Number(id));
  // Push subscriptions cascade the same way; deleted explicitly for the same
  // reason progress is — a leftover row would keep pushing to a device whose
  // account no longer exists.
  sqlite.prepare('DELETE FROM push_subscriptions WHERE user_id = ?').run(Number(id));
  sqlite.prepare('DELETE FROM users WHERE id = ?').run(Number(id));
}

// ── Admin / billing user helpers ────────────────────────────────────────────

function setUserAdmin(id, isAdmin) {
  const now = new Date().toISOString();
  sqlite
    .prepare('UPDATE users SET is_admin = ?, updated_at = ? WHERE id = ?')
    .run(isAdmin ? 1 : 0, now, Number(id));
  return getUserById(id);
}

function setUserProTier(id, { tier, expiresAt = null, stripeCustomerId, stripeSubscriptionId }) {
  const now = new Date().toISOString();
  const fields = ['pro_tier = @tier', 'updated_at = @now'];
  const params = { id: Number(id), tier, now };
  if (expiresAt !== undefined) { fields.push('pro_expires_at = @expiresAt'); params.expiresAt = expiresAt; }
  if (stripeCustomerId !== undefined) { fields.push('stripe_customer_id = @stripeCustomerId'); params.stripeCustomerId = stripeCustomerId; }
  if (stripeSubscriptionId !== undefined) { fields.push('stripe_subscription_id = @stripeSubscriptionId'); params.stripeSubscriptionId = stripeSubscriptionId; }
  sqlite.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = @id`).run(params);
  return getUserById(id);
}

function getUserByStripeCustomerId(customerId) {
  if (!customerId) return null;
  return sqlite
    .prepare('SELECT * FROM users WHERE stripe_customer_id = ?')
    .get(String(customerId));
}

// Active pro check: tier !== 'free' AND (no expiry OR expiry in the future).
// 'lifetime' tier has no expires_at by design, so the second branch matches.
function isUserPro(user) {
  if (!user || user.pro_tier === 'free' || !user.pro_tier) return false;
  if (!user.pro_expires_at) return true;
  return user.pro_expires_at > new Date().toISOString();
}

// LIMIT/OFFSET take integers only; `1.5`, `1e999` or anything past 2^53 is a
// datatype mismatch.
const pageParams = (limit, offset) => ({
  limit: Math.min(Math.max(Math.trunc(Number(limit)) || 50, 1), 200),
  offset: Number.isFinite(Number(offset)) ? Math.min(Math.max(Math.trunc(Number(offset)), 0), 1_000_000_000) : 0,
});

function listUsers({ limit = 50, offset = 0, search = '' } = {}) {
  const params = pageParams(limit, offset);
  let where = '';
  if (search) {
    where = 'WHERE LOWER(u.email) LIKE LOWER(@q) OR LOWER(COALESCE(u.name, \'\')) LIKE LOWER(@q)';
    params.q = `%${search}%`;
  }
  const rows = sqlite
    .prepare(`
      SELECT
        u.id, u.email, u.name, u.created_at, u.updated_at,
        u.is_admin, u.pro_tier, u.pro_expires_at,
        u.stripe_customer_id, u.stripe_subscription_id,
        (SELECT COUNT(*) FROM progress p WHERE p.user_id = u.id) AS progress_count,
        (SELECT MAX(p.updated_at) FROM progress p WHERE p.user_id = u.id) AS last_active_at
      FROM users u
      ${where}
      ORDER BY u.created_at DESC
      LIMIT @limit OFFSET @offset
    `)
    .all(params);
  const total = sqlite
    .prepare(`SELECT COUNT(*) AS c FROM users u ${where}`)
    .get(params).c;
  return { rows, total };
}

// Aggregated metrics for the admin dashboard. All numbers are derived from
// SQLite rows we already maintain — no external analytics dependency.
function getAdminStats() {
  const since = (h) => new Date(Date.now() - h * 3600_000).toISOString();
  const totalUsers = sqlite.prepare('SELECT COUNT(*) AS c FROM users').get().c;
  const proUsers = sqlite
    .prepare("SELECT COUNT(*) AS c FROM users WHERE pro_tier != 'free' AND (pro_expires_at IS NULL OR pro_expires_at > ?)")
    .get(new Date().toISOString()).c;
  const signups24h = sqlite
    .prepare('SELECT COUNT(*) AS c FROM users WHERE created_at >= ?')
    .get(since(24)).c;
  const signups7d = sqlite
    .prepare('SELECT COUNT(*) AS c FROM users WHERE created_at >= ?')
    .get(since(168)).c;
  const activeUsers7d = sqlite
    .prepare('SELECT COUNT(DISTINCT user_id) AS c FROM progress WHERE updated_at >= ? AND user_id != 0')
    .get(since(168)).c;
  const activeUsers30d = sqlite
    .prepare('SELECT COUNT(DISTINCT user_id) AS c FROM progress WHERE updated_at >= ? AND user_id != 0')
    .get(since(720)).c;
  const totalProgress = sqlite.prepare('SELECT COUNT(*) AS c FROM progress').get().c;
  const completed = sqlite.prepare("SELECT COUNT(*) AS c FROM progress WHERE status = 'completed'").get().c;
  const aiGrades24h = sqlite
    .prepare('SELECT COUNT(*) AS c FROM ai_grade_log WHERE created_at >= ?')
    .get(since(24)).c;
  const openContacts = sqlite
    .prepare("SELECT COUNT(*) AS c FROM contact_messages WHERE status = 'open'")
    .get().c;
  return {
    totalUsers, proUsers, signups24h, signups7d,
    activeUsers7d, activeUsers30d,
    totalProgress, completed,
    aiGrades24h, openContacts,
    totalQuestions: sqlite.prepare('SELECT COUNT(*) AS c FROM questions').get().c,
    totalTopics: sqlite.prepare('SELECT COUNT(*) AS c FROM topics').get().c,
  };
}

// ── Contact inbox ────────────────────────────────────────────────────────────

function createContactMessage({ userId = null, name = null, email, message, ip = null }) {
  const now = new Date().toISOString();
  const info = sqlite
    .prepare(`
      INSERT INTO contact_messages (user_id, name, email, message, status, ip, created_at)
      VALUES (@user_id, @name, @email, @message, 'open', @ip, @created_at)
    `)
    .run({
      user_id: userId ? Number(userId) : null,
      name: name || null,
      email: String(email).trim().toLowerCase(),
      message: String(message).trim(),
      ip: ip || null,
      created_at: now,
    });
  return getContactMessage(info.lastInsertRowid);
}

function getContactMessage(id) {
  return sqlite
    .prepare('SELECT * FROM contact_messages WHERE id = ?')
    .get(Number(id));
}

function listContactMessages({ status = null, limit = 50, offset = 0 } = {}) {
  const params = pageParams(limit, offset);
  let where = '';
  if (status) { where = 'WHERE status = @status'; params.status = status; }
  const rows = sqlite
    .prepare(`
      SELECT cm.*, u.email AS user_email, u.name AS user_name
      FROM contact_messages cm
      LEFT JOIN users u ON u.id = cm.user_id
      ${where}
      ORDER BY cm.created_at DESC
      LIMIT @limit OFFSET @offset
    `)
    .all(params);
  const total = sqlite
    .prepare(`SELECT COUNT(*) AS c FROM contact_messages ${where}`)
    .get(params).c;
  return { rows, total };
}

function setContactStatus(id, status) {
  const now = new Date().toISOString();
  const resolvedAt = status === 'resolved' ? now : null;
  sqlite
    .prepare('UPDATE contact_messages SET status = ?, resolved_at = ? WHERE id = ?')
    .run(status, resolvedAt, Number(id));
  return getContactMessage(id);
}

function recentContactsByIp(ip, withinMs) {
  if (!ip) return 0;
  const since = new Date(Date.now() - withinMs).toISOString();
  return sqlite
    .prepare('SELECT COUNT(*) AS c FROM contact_messages WHERE ip = ? AND created_at >= ?')
    .get(String(ip), since).c;
}

// ── AI grade quota ───────────────────────────────────────────────────────────

function logAiGrade({ userId = null, ip = null }) {
  sqlite
    .prepare('INSERT INTO ai_grade_log (user_id, ip, created_at) VALUES (?, ?, ?)')
    .run(userId ? Number(userId) : null, ip || null, new Date().toISOString());
}

// Atomically reserve one grade against the daily cap: re-read the 24h count and
// insert the log row in ONE synchronous transaction, so two requests in flight
// at once can't both pass the same pre-increment count and both bill the model.
// Returns { reserved, used, id }. The model call is the real spend; refund the
// reserved row with refundAiGrade(id) if that call fails.
function reserveAiGrade({ userId = null, ip = null, cap }) {
  const tx = sqlite.transaction(() => {
    const used = aiGradeCountLast24h({ userId, ip });
    if (used >= cap) return { reserved: false, used };
    const info = sqlite
      .prepare('INSERT INTO ai_grade_log (user_id, ip, created_at) VALUES (?, ?, ?)')
      .run(userId ? Number(userId) : null, ip || null, new Date().toISOString());
    return { reserved: true, used, id: info.lastInsertRowid };
  });
  return tx();
}

// Undo a reservation whose model call never landed, so a failed grade doesn't
// burn the user's daily allowance.
function refundAiGrade(id) {
  if (id === null || id === undefined) return;
  sqlite.prepare('DELETE FROM ai_grade_log WHERE id = ?').run(Number(id));
}

// Counts grades fired in the last 24h by the same identity. Falls back to IP
// for anonymous users so an unauthed visitor can't loop the endpoint either.
function aiGradeCountLast24h({ userId = null, ip = null }) {
  const since = new Date(Date.now() - 24 * 3600_000).toISOString();
  if (userId) {
    return sqlite
      .prepare('SELECT COUNT(*) AS c FROM ai_grade_log WHERE user_id = ? AND created_at >= ?')
      .get(Number(userId), since).c;
  }
  if (ip) {
    return sqlite
      .prepare('SELECT COUNT(*) AS c FROM ai_grade_log WHERE ip = ? AND created_at >= ? AND user_id IS NULL')
      .get(String(ip), since).c;
  }
  return 0;
}

// ── Push subscriptions ───────────────────────────────────────────────────────
// Consumed by push.js. The endpoint is the natural key (it identifies a
// browser), so every write is keyed on it rather than on a client-supplied id.

/**
 * Insert or update the row for one browser.
 *
 * ON CONFLICT(endpoint) also reassigns user_id: a push endpoint belongs to the
 * browser, so when a second account signs in on a shared machine the row must
 * follow the new owner. Without that the previous account keeps receiving
 * notifications on a device it no longer controls.
 *
 * dueCount/nextDueAt are optional. state_reported_at is only stamped when a
 * count actually arrives — push.js refuses to send daily reminders to a device
 * that has never reported its SRS state, since there is no evidence anything
 * is due there.
 */
function upsertPushSubscription({
  userId, endpoint, p256dh, auth, tzOffsetMinutes = 0, dueCount, nextDueAt = null,
}) {
  const uid = Number(userId);
  if (!uid) throw new Error('upsertPushSubscription requires a real user id');
  const now = new Date().toISOString();
  const hasState = Number.isInteger(dueCount);

  // The snapshot columns are only touched when the client actually sent a
  // count. A service worker re-subscribing without one (it may not have the
  // question list to hand) must not silently wipe the last known due state —
  // that would leave state_reported_at saying "we have a snapshot" next to a
  // snapshot of zero, and the device would stop being reminded.
  const assignments = [
    'user_id = excluded.user_id',
    'p256dh = excluded.p256dh',
    'auth = excluded.auth',
    'tz_offset_minutes = excluded.tz_offset_minutes',
    'last_seen_at = excluded.last_seen_at',
  ];
  if (hasState) {
    assignments.push(
      'due_count = excluded.due_count',
      'next_due_at = excluded.next_due_at',
      'state_reported_at = excluded.state_reported_at',
    );
  }

  sqlite
    .prepare(`
      INSERT INTO push_subscriptions (
        user_id, endpoint, p256dh, auth, tz_offset_minutes,
        due_count, next_due_at, state_reported_at, created_at, last_seen_at
      )
      VALUES (
        @user_id, @endpoint, @p256dh, @auth, @tz_offset_minutes,
        @due_count, @next_due_at, @state_reported_at, @now, @now
      )
      ON CONFLICT(endpoint) DO UPDATE SET ${assignments.join(', ')}
    `)
    .run({
      user_id: uid,
      endpoint: String(endpoint),
      p256dh: String(p256dh),
      auth: String(auth),
      tz_offset_minutes: Number(tzOffsetMinutes) || 0,
      due_count: hasState ? dueCount : 0,
      next_due_at: hasState ? nextDueAt : null,
      state_reported_at: hasState ? now : null,
      now,
    });

  return getPushSubscriptionByEndpoint(endpoint);
}

function getPushSubscriptionByEndpoint(endpoint) {
  return sqlite
    .prepare('SELECT * FROM push_subscriptions WHERE endpoint = ?')
    .get(String(endpoint));
}

function listPushSubscriptionsForUser(userId) {
  return sqlite
    .prepare('SELECT * FROM push_subscriptions WHERE user_id = ? ORDER BY id')
    .all(Number(userId) || 0);
}

/**
 * Refresh a browser's SRS snapshot. Scoped to the owning user so that holding
 * someone else's endpoint doesn't let you rewrite their reminder state.
 * Returns false when the endpoint isn't this user's.
 */
function updatePushSubscriptionState({ userId, endpoint, dueCount, nextDueAt = null, tzOffsetMinutes }) {
  const uid = Number(userId);
  if (!uid) throw new Error('updatePushSubscriptionState requires a real user id');
  const now = new Date().toISOString();
  const fields = [
    'due_count = @due_count',
    'next_due_at = @next_due_at',
    'state_reported_at = @now',
    'last_seen_at = @now',
  ];
  const params = {
    user_id: uid,
    endpoint: String(endpoint),
    due_count: Number(dueCount) || 0,
    next_due_at: nextDueAt || null,
    now,
  };
  // Only overwrite the offset when the client sent one — a sync that omits it
  // must not silently reset the device to UTC.
  if (Number.isInteger(tzOffsetMinutes)) {
    fields.push('tz_offset_minutes = @tz_offset_minutes');
    params.tz_offset_minutes = tzOffsetMinutes;
  }
  const info = sqlite
    .prepare(`UPDATE push_subscriptions SET ${fields.join(', ')} WHERE user_id = @user_id AND endpoint = @endpoint`)
    .run(params);
  return info.changes > 0;
}

function deletePushSubscription(userId, endpoint) {
  const info = sqlite
    .prepare('DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?')
    .run(Number(userId) || 0, String(endpoint));
  return info.changes > 0;
}

// Used by the delivery path when a push service answers 404/410 — the
// subscription is gone at the vendor, so it goes here too. Not user-scoped:
// the vendor's verdict is authoritative regardless of who owns the row.
function deletePushSubscriptionById(id) {
  const info = sqlite.prepare('DELETE FROM push_subscriptions WHERE id = ?').run(Number(id));
  return info.changes > 0;
}

/**
 * Candidates for the daily reminder job: every device that has reported its
 * SRS state at least once and recently enough to still be trusted.
 *
 * Quiet-hours and once-per-day filtering deliberately happen in push.js, not
 * here — they need per-row local-time arithmetic that SQLite would express
 * far less legibly than JavaScript, and the candidate set is small.
 */
function listPushSubscriptionsForReminder({ reportedSince }) {
  return sqlite
    .prepare(`
      SELECT id, user_id, endpoint, p256dh, auth, tz_offset_minutes,
             due_count, next_due_at, state_reported_at, last_notified_at
      FROM push_subscriptions
      WHERE state_reported_at IS NOT NULL AND state_reported_at >= @reportedSince
      ORDER BY id
    `)
    .all({ reportedSince });
}

function markPushNotified(id, at) {
  sqlite
    .prepare('UPDATE push_subscriptions SET last_notified_at = ? WHERE id = ?')
    .run(at || new Date().toISOString(), Number(id));
}

// Atomically claim today's reminder slot for a device: set last_notified_at to
// `at` only if it still holds `prev` — the value the caller read before it
// decided the device was due. Returns true only for the caller that wins, so
// two overlapping daily passes (the in-process timer and an external cron, say)
// can never both send to the same device. `IS` handles a null prev correctly.
function claimPushNotification(id, at, prev) {
  const info = sqlite
    .prepare('UPDATE push_subscriptions SET last_notified_at = @at WHERE id = @id AND last_notified_at IS @prev')
    .run({ id: Number(id), at: at || new Date().toISOString(), prev: prev ?? null });
  return info.changes === 1;
}

// ── Lifecycle ───────────────────────────────────────────────────────────────

function questionExists(questionId) {
  const row = sqlite
    .prepare('SELECT 1 FROM questions WHERE id = ?')
    .get(Number(questionId));
  return !!row;
}

// Used by the AI-grading endpoint. Joins the topic so we can include the
// reference answer + topic context in the prompt without trusting the
// client to send the reference text (which could be tampered with to bias
// the grade or just to waste tokens on stuff that isn't real).
function getQuestionForGrading(questionId) {
  return sqlite
    .prepare(`
      SELECT
        q.id, q.question, q.answer, q.code_example, q.code_language,
        q.difficulty,
        t.title AS topic_title, t.level
      FROM questions q
      JOIN topics t ON t.id = q.topic_id
      WHERE q.id = ?
    `)
    .get(Number(questionId));
}

// Health means "can serve the catalogue", not "can run SELECT 1": an empty
// questions table answered every query with [] while /healthz said ok.
function ping() {
  return sqlite.prepare('SELECT COUNT(*) AS c FROM questions').get().c > 0;
}

function close() {
  try { sqlite.close(); } catch { /* already closed */ }
}

module.exports = {
  init,
  close,
  ping,
  getTopics,
  getTopic,
  getQuestions,
  questionExists,
  getQuestionForGrading,
  setProgress,
  bulkSetProgress,
  getStats,
  resetProgress,
  createUser,
  getUserByEmail,
  getUserById,
  updateUserName,
  updateUserPassword,
  setRecoveryCode,
  updateUserEmail,
  deleteUser,
  setUserAdmin,
  setUserProTier,
  getUserByStripeCustomerId,
  isUserPro,
  listUsers,
  getAdminStats,
  createContactMessage,
  getContactMessage,
  listContactMessages,
  setContactStatus,
  recentContactsByIp,
  logAiGrade,
  aiGradeCountLast24h,
  upsertPushSubscription,
  getPushSubscriptionByEndpoint,
  listPushSubscriptionsForUser,
  updatePushSubscriptionState,
  deletePushSubscription,
  deletePushSubscriptionById,
  listPushSubscriptionsForReminder,
  markPushNotified,
  claimPushNotification,
  reserveAiGrade,
  refundAiGrade,
};
