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
const SITEMAP_FILE = path.join(ROOT, 'frontend', 'public', 'sitemap.xml');

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

// Resolve the canonical site URL the sitemap will advertise. SITE_URL wins;
// otherwise derive the GitHub Pages URL from CI env (owner.github.io/repo).
// Returns null if we cannot guess — in that case we skip sitemap generation
// rather than ship a sitemap pointing at the wrong host.
function resolveSiteUrl() {
  if (process.env.SITE_URL) {
    return process.env.SITE_URL.replace(/\/+$/, '');
  }
  const repo = process.env.GITHUB_REPOSITORY;
  if (repo && repo.includes('/')) {
    const [owner, name] = repo.split('/');
    return `https://${owner.toLowerCase()}.github.io/${name}`;
  }
  return null;
}

function buildSitemap(topics, siteUrl) {
  const today = new Date().toISOString().slice(0, 10);
  // Per-platform landing pages share content with /, but each gets its own
  // hero copy + canonical, so they're indexable as independent SEO entry
  // points. Keep them at priority 0.9 (just under root) and weekly cadence.
  const PLATFORM_LANDINGS = ['/flutter', '/ios', '/android', '/kmp'];
  const urls = [
    { loc: '/', priority: '1.0', changefreq: 'weekly' },
    ...PLATFORM_LANDINGS.map((p) => ({ loc: p, priority: '0.9', changefreq: 'weekly' })),
    { loc: '/pricing', priority: '0.6', changefreq: 'monthly' },
    { loc: '/contact', priority: '0.4', changefreq: 'monthly' },
    ...topics.map((t) => ({
      loc: `/topic/${t.slug}`,
      priority: '0.8',
      changefreq: 'monthly',
    })),
    ...topics.map((t) => ({
      loc: `/topic/${t.slug}/cheatsheet`,
      priority: '0.5',
      changefreq: 'monthly',
    })),
  ];
  const body = urls
    .map(
      (u) =>
        `  <url>\n    <loc>${siteUrl}${u.loc}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`,
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

function main() {
  const checkMode = process.argv.includes('--check');
  const payload = build();
  const next = format(payload);
  const siteUrl = resolveSiteUrl();
  const sitemap = siteUrl ? buildSitemap(payload.topics, siteUrl) : null;

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
  console.log(`✓ wrote ${path.relative(ROOT, OUT_FILE)} — ${payload.topics.length} topics, ${payload.questions.length} questions`);

  if (sitemap) {
    fs.writeFileSync(SITEMAP_FILE, sitemap);
    const urlCount = (sitemap.match(/<url>/g) || []).length;
    console.log(`✓ wrote ${path.relative(ROOT, SITEMAP_FILE)} — ${urlCount} URLs (host: ${siteUrl})`);
  } else {
    console.log('· sitemap.xml skipped — set SITE_URL or run inside GitHub Actions');
  }
}

main();
