#!/usr/bin/env node
//
// One-off: rewrite every answer from the house plain-text convention into
// Markdown, in both places answers live:
//
//   backend/data/seed/questions/*.json   (English, the seed)
//   frontend/src/i18n/contentRu.ts       (Russian, `answer: '…'` literals)
//
// The convention the answers were written in is already structure, just not
// Markdown: "• " bullets, "Heading:" lines introducing a list, `code` spans,
// "term — definition" bullets. This script makes the structure explicit and
// escapes the few characters Markdown would misread (`List<T>`, `go_router`,
// `async*`) so nothing renders differently from what the author typed.
//
//   node backend/scripts/migrate-answers-to-markdown.js --dry-run   # report only
//   node backend/scripts/migrate-answers-to-markdown.js             # rewrite files
//
// Every rewrite is checked: stripping the Markdown back out must reproduce
// the original text (bullets and heading colons aside), or the script stops.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const QUESTIONS_DIR = path.join(ROOT, 'backend', 'data', 'seed', 'questions');
const RU_FILE = path.join(ROOT, 'frontend', 'src', 'i18n', 'contentRu.ts');
const DRY_RUN = process.argv.includes('--dry-run');

// ── The transform ────────────────────────────────────────────────────────────

// A short label: no sentence punctuation, at most four words. Used to decide
// whether the term before " — " or ":" in a bullet deserves emphasis.
const isTerm = (s) =>
  s.length >= 2 && s.length <= 40 && !/[.;:(=`"«»]/.test(s) && s.trim().split(/\s+/).length <= 4;

// Escape Markdown syntax in prose (never inside code spans).
function escapeProse(s) {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/\*/g, '\\*')
    .replace(/_/g, '\\_')
    .replace(/<(?=\S)/g, '\\<')
    .replace(/^(\s*)([#>+])/g, '$1\\$2')
    .replace(/^(\s*\d+)([.)])(\s)/g, (m, n, p, sp) => `${n}\\${p}${sp}`) // only hit for lines we did NOT mark as lists
    .replace(/\[/g, '\\[');
}

// Apply `fn` to the prose between code spans, leaving the spans untouched.
function mapProse(line, fn) {
  return line
    .split(/(`[^`\n]*`)/)
    .map((part, i) => (i % 2 === 1 ? part : fn(part)))
    .join('');
}

function isBullet(line) { return /^\s*• /.test(line); }
function isNumbered(line) { return /^\s*\d+[.)] /.test(line); }
function isBlank(line) { return line.trim() === ''; }

// "Key rules:" on its own line — a run-in heading for the list that follows.
function isColonHeading(line, next) {
  if (isBullet(line) || isNumbered(line)) return false;
  const t = line.trim();
  if (!/:$/.test(t) || t.length > 48) return false;
  if (/[.;!?]/.test(t.slice(0, -1))) return false;
  return next !== undefined && (isBullet(next) || isNumbered(next));
}

function convertBullet(line) {
  const m = line.match(/^(\s*)• (.*)$/);
  const indent = m[1].length >= 1 ? '  ' : '';
  let body = m[2];

  // Emphasise a short leading term: "term — rest" or "term: rest".
  const dash = body.match(/^(.{2,40}?) — (.*)$/);
  const colon = body.match(/^([^:]{2,40}?): (.*)$/);
  if (dash && isTerm(dash[1])) {
    body = `**${mapProse(dash[1], escapeProse)}** — ${mapProse(dash[2], escapeProse)}`;
  } else if (colon && isTerm(colon[1])) {
    body = `**${mapProse(colon[1], escapeProse)}**: ${mapProse(colon[2], escapeProse)}`;
  } else {
    body = mapProse(body, escapeProse);
  }
  return `${indent}- ${body}`;
}

function convertNumbered(line) {
  const m = line.match(/^(\s*)(\d+)[.)] (.*)$/);
  return `${m[1]}${m[2]}. ${mapProse(m[3], escapeProse)}`;
}

function toMarkdown(text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const next = lines[i + 1];
    if (isBlank(line)) { out.push(''); continue; }
    if (isBullet(line)) { out.push(convertBullet(line)); continue; }
    if (isNumbered(line)) { out.push(convertNumbered(line)); continue; }
    if (isColonHeading(line, next)) {
      // A heading needs a blank line before it to close the previous paragraph.
      if (out.length && out[out.length - 1] !== '') out.push('');
      out.push(`### ${mapProse(line.trim().slice(0, -1), escapeProse)}`);
      continue;
    }
    // Four leading spaces would start a code block; the two answers that do
    // this are continuation lines, so keep them as indented prose.
    const dedented = line.replace(/^ {4,}/, '  ');
    out.push(mapProse(dedented, escapeProse));
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

// ── The check: Markdown → plain must round-trip to the original ─────────────

function stripMarkdown(md) {
  return md
    .split('\n')
    .map((line) => {
      const structural = line
        .replace(/^### /, '')
        .replace(/^(\s*)- /, '$1• ')
        .replace(/^(\s*\d+)\. /, '$1. ');
      return mapProse(structural, (prose) => prose
        .replace(/\*\*((?:\\.|[^*\\])+)\*\*/g, '$1')
        .replace(/\\([\\*_<#>+\[.)])/g, '$1'));
    })
    .join('\n');
}

function normalizeOriginal(text) {
  return text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line, i, arr) => {
      if (isColonHeading(line, arr[i + 1])) return line.trim().slice(0, -1);
      return line
        .replace(/^ +• /, '  • ')
        .replace(/^ {4,}/, '  ')
        .replace(/^(\s*)(\d+)\) /, '$1$2. ');
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function convertChecked(original, label) {
  const md = toMarkdown(original);
  const back = stripMarkdown(md);
  const expected = normalizeOriginal(original);
  // A heading gains a blank line before it; compare with blank lines collapsed.
  const squash = (s) => s.replace(/\n+/g, '\n');
  if (squash(back) !== squash(expected)) {
    console.error(`✗ round-trip mismatch for ${label}\n--- expected\n${expected}\n--- got\n${back}\n--- markdown\n${md}`);
    process.exit(1);
  }
  return md;
}

// ── Seed JSON ────────────────────────────────────────────────────────────────

function migrateSeed() {
  const files = fs.readdirSync(QUESTIONS_DIR).filter((n) => n.endsWith('.json')).sort();
  let changed = 0;
  for (const name of files) {
    const file = path.join(QUESTIONS_DIR, name);
    const questions = JSON.parse(fs.readFileSync(file, 'utf8'));
    let touched = false;
    for (const q of questions) {
      const md = convertChecked(q.answer, `${name}#${q.id}`);
      if (md !== q.answer) { q.answer = md; touched = true; changed += 1; }
    }
    if (touched && !DRY_RUN) fs.writeFileSync(file, JSON.stringify(questions, null, 2) + '\n');
  }
  return changed;
}

// ── contentRu.ts ─────────────────────────────────────────────────────────────

// Serialise as a single-quoted JS string the way the file already does.
const toLiteral = (s) => "'" + s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n') + "'";

function migrateRu() {
  const src = fs.readFileSync(RU_FILE, 'utf8');
  let changed = 0;
  const out = src.replace(/answer:\s*'((?:[^'\\]|\\.)*)'/g, (match, literal) => {
    const original = new Function(`return '${literal}'`)();
    const md = convertChecked(original, `contentRu ${literal.slice(0, 40)}…`);
    if (md === original) return match;
    changed += 1;
    return `answer: ${toLiteral(md)}`;
  });
  if (!DRY_RUN) fs.writeFileSync(RU_FILE, out);
  return changed;
}

// ── Run ──────────────────────────────────────────────────────────────────────

if (require.main === module) {
  const seed = migrateSeed();
  const ru = migrateRu();
  console.log(`${DRY_RUN ? '(dry run) ' : ''}rewrote ${seed} English and ${ru} Russian answers as Markdown`);
  if (process.argv.includes('--sample')) {
    const sample = JSON.parse(fs.readFileSync(path.join(QUESTIONS_DIR, '02-oop-dart.json'), 'utf8')).find((q) => q.id === 7);
    console.log('\n--- sample #7 ---\n' + toMarkdown(sample.answer));
  }
}

module.exports = { toMarkdown, stripMarkdown };
