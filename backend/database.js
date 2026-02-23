
const fs = require('fs');
const path = require('path');
const BetterSqlite3 = require('better-sqlite3');

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'interview.db');
const SEED_DIR = path.join(DATA_DIR, 'seed');
const SEED_TOPICS_FILE = path.join(SEED_DIR, 'topics.json');
const SEED_QUESTIONS_DIR = path.join(SEED_DIR, 'questions');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const sqlite = new BetterSqlite3(DB_FILE);
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

    CREATE INDEX IF NOT EXISTS idx_topics_level ON topics(level);
    CREATE INDEX IF NOT EXISTS idx_topics_order ON topics(order_index);
    CREATE INDEX IF NOT EXISTS idx_questions_topic ON questions(topic_id);
    CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions(difficulty);
    CREATE INDEX IF NOT EXISTS idx_questions_order ON questions(order_index);
    CREATE INDEX IF NOT EXISTS idx_progress_status ON progress(status);
  `);

  seedIfEmpty();
  removeGeneralQuestions();
  normalizeExistingQuestions();
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
      .filter(question => question.order_index < 100)
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

function getTopics(level) {
  let sql = `
    SELECT
      t.*,
      COUNT(q.id) AS question_count,
      SUM(CASE WHEN p.status = 'completed' THEN 1 ELSE 0 END) AS completed_count
    FROM topics t
    LEFT JOIN questions q ON q.topic_id = t.id
    LEFT JOIN progress p ON p.question_id = q.id
  `;

  const params = {};
  if (level) {
    sql += ' WHERE t.level = @level';
    params.level = level;
  }

  sql += ' GROUP BY t.id ORDER BY t.order_index ASC';

  return sqlite.prepare(sql).all(params);
}

function getTopic(slug) {
  const topic = sqlite.prepare('SELECT * FROM topics WHERE slug = ?').get(slug);
  if (!topic) return null;

  const questions = sqlite
    .prepare(`
      SELECT
        q.*,
        COALESCE(p.status, 'not_started') AS status,
        p.notes
      FROM questions q
      LEFT JOIN progress p ON p.question_id = q.id
      WHERE q.topic_id = ?
      ORDER BY q.order_index ASC
    `)
    .all(topic.id);

  const completedCount = questions.filter(q => q.status === 'completed').length;

  return {
    ...topic,
    question_count: questions.length,
    completed_count: completedCount,
    questions,
  };
}

function getQuestions({ level, difficulty, search } = {}) {
  const conditions = [];
  const params = {};

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
      LEFT JOIN progress p ON p.question_id = q.id
      ${whereClause}
      ORDER BY t.order_index ASC, q.order_index ASC
    `)
    .all(params);
}

function setProgress(questionId, status, notes) {
  const now = new Date().toISOString();

  sqlite
    .prepare(`
      INSERT INTO progress (question_id, status, notes, updated_at)
      VALUES (@question_id, @status, @notes, @updated_at)
      ON CONFLICT(question_id) DO UPDATE SET
        status = excluded.status,
        notes = excluded.notes,
        updated_at = excluded.updated_at
    `)
    .run({
      question_id: Number(questionId),
      status,
      notes: notes || null,
      updated_at: now,
    });

  return { status, notes: notes || null, updated_at: now };
}

function getStats() {
  const totalQuestions = sqlite.prepare('SELECT COUNT(*) AS count FROM questions').get().count;
  const completed = sqlite
    .prepare("SELECT COUNT(*) AS count FROM progress WHERE status = 'completed'")
    .get().count;
  const inProgress = sqlite
    .prepare("SELECT COUNT(*) AS count FROM progress WHERE status = 'in_progress'")
    .get().count;

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

function resetProgress() {
  sqlite.prepare('DELETE FROM progress').run();
}

module.exports = {
  init,
  getTopics,
  getTopic,
  getQuestions,
  setProgress,
  getStats,
  resetProgress,
};
