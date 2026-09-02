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
const ROADMAP_FILE = path.join(SEED_DIR, 'roadmap.json');
const OUT_FILE = path.join(ROOT, 'frontend', 'public', 'seed', 'static-data.json');
const SITEMAP_FILE = path.join(ROOT, 'frontend', 'public', 'sitemap.xml');
const ROBOTS_FILE = path.join(ROOT, 'frontend', 'public', 'robots.txt');

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

// The roadmap is sixteen rungs — junior-1..5, mid-1..5, senior-1..5, staff —
// and one track per stack that fills every rung with (topic × difficulty)
// nodes. Every node resolves to real questions at build time, so a rung can
// never be empty and a question can never be counted twice within a track.
// The check that a track covers *every* question of its own platform lives in
// the frontend test suite (src/lib/roadmap.test.ts), next to the platform
// taxonomy it needs.
const ROADMAP_BANDS = ['junior', 'mid', 'senior', 'staff'];
const DIFFICULTIES = ['easy', 'medium', 'hard'];

function validateRoadmap(roadmap, topics, questions) {
  const fail = (msg) => { throw new Error(`roadmap.json: ${msg}`); };

  if (!roadmap || !Array.isArray(roadmap.rungs) || !Array.isArray(roadmap.tracks)) {
    fail('expected { rungs: [], tracks: [] }');
  }

  const rungIds = new Set();
  roadmap.rungs.forEach((r, i) => {
    if (!r.id || typeof r.id !== 'string') fail(`rungs[${i}] has no id`);
    if (rungIds.has(r.id)) fail(`duplicate rung id "${r.id}"`);
    if (!ROADMAP_BANDS.includes(r.band)) fail(`rung "${r.id}" has unknown band "${r.band}"`);
    if (!Number.isInteger(r.step) || r.step < 1) fail(`rung "${r.id}" needs a positive integer step`);
    rungIds.add(r.id);
  });
  if (rungIds.size === 0) fail('no rungs defined');

  const topicBySlug = new Map(topics.map((t) => [t.slug, t]));
  const questionsByTopic = new Map();
  for (const q of questions) {
    if (!questionsByTopic.has(q.topic_id)) questionsByTopic.set(q.topic_id, []);
    questionsByTopic.get(q.topic_id).push(q);
  }

  const platforms = new Set();
  for (const track of roadmap.tracks) {
    if (!track.platform || typeof track.platform !== 'string') fail('a track has no platform');
    if (platforms.has(track.platform)) fail(`duplicate track "${track.platform}"`);
    platforms.add(track.platform);
    if (!track.rungs || typeof track.rungs !== 'object') fail(`track "${track.platform}" has no rungs`);

    for (const id of Object.keys(track.rungs)) {
      if (!rungIds.has(id)) fail(`track "${track.platform}" references unknown rung "${id}"`);
    }

    const seen = new Set();
    for (const id of rungIds) {
      const rung = track.rungs[id];
      if (!rung) fail(`track "${track.platform}" is missing rung "${id}"`);
      if (!rung.title_en || !rung.title_ru) fail(`track "${track.platform}" rung "${id}" needs title_en and title_ru`);
      if (!Array.isArray(rung.nodes) || rung.nodes.length === 0) fail(`track "${track.platform}" rung "${id}" has no nodes`);

      for (const node of rung.nodes) {
        const topic = topicBySlug.get(node.topic);
        if (!topic) fail(`track "${track.platform}" rung "${id}" references unknown topic "${node.topic}"`);
        if (!Array.isArray(node.difficulty) || node.difficulty.length === 0) {
          fail(`track "${track.platform}" rung "${id}" node "${node.topic}" needs a difficulty list`);
        }
        for (const d of node.difficulty) {
          if (!DIFFICULTIES.includes(d)) fail(`track "${track.platform}" rung "${id}" node "${node.topic}" has unknown difficulty "${d}"`);
        }
        const matched = (questionsByTopic.get(topic.id) || []).filter((q) => node.difficulty.includes(q.difficulty));
        if (matched.length === 0) {
          fail(`track "${track.platform}" rung "${id}" node "${node.topic}" [${node.difficulty.join(', ')}] matches no questions`);
        }
        for (const q of matched) {
          if (seen.has(q.id)) fail(`track "${track.platform}": question ${q.id} ("${node.topic}") appears in more than one rung`);
          seen.add(q.id);
        }
      }
    }
  }
  if (platforms.size === 0) fail('no tracks defined');
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

  const roadmap = readJson(ROADMAP_FILE);
  validateRoadmap(roadmap, topics, questions);

  return { topics, questions, roadmap };
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
    { loc: '/roadmap', priority: '0.9', changefreq: 'weekly' },
    { loc: '/topics', priority: '0.9', changefreq: 'weekly' },
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
  console.log(`✓ wrote ${path.relative(ROOT, OUT_FILE)} — ${payload.topics.length} topics, ${payload.questions.length} questions, ${payload.roadmap.tracks.length} roadmap tracks`);

  if (sitemap) {
    fs.writeFileSync(SITEMAP_FILE, sitemap);
    // The Sitemap directive must be an absolute URL.
    fs.writeFileSync(ROBOTS_FILE, `User-agent: *\nAllow: /\n\n# /admin is dev-only and not built for production; disallowed defensively.\nDisallow: /admin\n\nSitemap: ${siteUrl}/sitemap.xml\n`);
    const urlCount = (sitemap.match(/<url>/g) || []).length;
    console.log(`✓ wrote ${path.relative(ROOT, SITEMAP_FILE)} — ${urlCount} URLs (host: ${siteUrl})`);
  } else {
    console.log('· sitemap.xml skipped — set SITE_URL or run inside GitHub Actions');
  }
}

if (require.main === module) main();

module.exports = { build, validateRoadmap };
