#!/usr/bin/env node
//
// Generate frontend/public/seed/static-data.json from backend seed JSON.
//
// Why: the GitHub Pages build ships without a backend and reads this file
// directly. Hand-editing it after every seed change is the single biggest
// source of dev/prod drift in this repo. Run this after touching anything
// under backend/data/seed/.
//
// Usage:
//   npm --prefix backend run generate:static-data
//   # or:
//   node backend/scripts/generate-static-data.js [--check]
//
// `--check` exits non-zero if the file would change — used in CI to fail
// PRs that forget to regenerate.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const SEED_DIR = path.join(__dirname, '..', 'data', 'seed');
const TOPICS_FILE = path.join(SEED_DIR, 'topics.json');
const QUESTIONS_DIR = path.join(SEED_DIR, 'questions');
const OUT_FILE = path.join(ROOT, 'frontend', 'public', 'seed', 'static-data.json');

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function build() {
  if (!fs.existsSync(TOPICS_FILE)) {
    throw new Error(`Missing seed topics: ${TOPICS_FILE}`);
  }
  if (!fs.existsSync(QUESTIONS_DIR)) {
    throw new Error(`Missing seed questions dir: ${QUESTIONS_DIR}`);
  }

  // Mirrors backend/database.js: strip emoji icons (set in DB by stripTopicIcons).
  const topics = readJson(TOPICS_FILE).map((t) => ({ ...t, icon: '' }));

  const files = fs
    .readdirSync(QUESTIONS_DIR)
    .filter((n) => n.endsWith('.json'))
    .sort();

  // Mirror DB-side filter: drop scenario/general questions (>=100) and known
  // duplicates so the static bundle matches what an authenticated API would
  // return.
  const KNOWN_DUPLICATE_IDS = new Set([67, 70]);
  const questions = files
    .flatMap((f) => readJson(path.join(QUESTIONS_DIR, f)))
    .filter((q) => q.order_index < 100 && !KNOWN_DUPLICATE_IDS.has(q.id))
    .map((q) => ({
      ...q,
      code_language: q.code_language || 'dart',
    }));

  // Stable sort matches the SQL ORDER BY in getQuestions / getTopic.
  questions.sort((a, b) => {
    const ta = topics.find((t) => t.id === a.topic_id)?.order_index ?? 0;
    const tb = topics.find((t) => t.id === b.topic_id)?.order_index ?? 0;
    if (ta !== tb) return ta - tb;
    return a.order_index - b.order_index;
  });
  topics.sort((a, b) => a.order_index - b.order_index);

  return { topics, questions };
}

function format(payload) {
  return JSON.stringify(payload, null, 2) + '\n';
}

function main() {
  const checkMode = process.argv.includes('--check');
  const next = format(build());

  if (checkMode) {
    const current = fs.existsSync(OUT_FILE) ? fs.readFileSync(OUT_FILE, 'utf8') : '';
    if (current !== next) {
      console.error(
        '✗ static-data.json is out of sync with backend/data/seed/.\n' +
        '  Run: npm --prefix backend run generate:static-data',
      );
      process.exit(1);
    }
    console.log('✓ static-data.json is up to date');
    return;
  }

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, next);
  const payload = JSON.parse(next);
  console.log(`✓ wrote ${path.relative(ROOT, OUT_FILE)} — ${payload.topics.length} topics, ${payload.questions.length} questions`);
}

main();
