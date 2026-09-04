#!/usr/bin/env node
//
// Generate the frontend's static seed bundle from backend seed JSON:
//
//   frontend/public/seed/static-data.json     topics, roadmap, and every
//                                             question WITHOUT its answer and
//                                             code example (~80 KB raw)
//   frontend/public/seed/answers/<slug>.json  the answers and code examples
//                                             of one topic (~40 KB raw each)
//
// Why two shapes: the GitHub Pages build ships without a backend and reads
// these files directly. Answers and code examples are 92% of the bytes and
// nothing on the first screen needs them, so a phone on 3G was downloading
// ~650 KB (gzipped) of prose before Today could paint. The catalogue now
// paints first; a topic's answers arrive when a topic, session or search
// asks for them. Hand-editing any of this after a seed change is the single
// biggest source of dev/prod drift in this repo — run this script instead.
//
// Usage:
//   npm --prefix backend run generate:static-data
//   # or:
//   node backend/scripts/generate-static-data.js [--check]
//
// `--check` exits non-zero if any output would change (or a stale answers
// file is lying around) — used in CI to fail PRs that forget to regenerate.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const SEED_DIR = path.join(__dirname, '..', 'data', 'seed');
const TOPICS_FILE = path.join(SEED_DIR, 'topics.json');
const QUESTIONS_DIR = path.join(SEED_DIR, 'questions');
const ROADMAP_FILE = path.join(SEED_DIR, 'roadmap.json');
const OUT_FILE = path.join(ROOT, 'frontend', 'public', 'seed', 'static-data.json');
const ANSWERS_DIR = path.join(ROOT, 'frontend', 'public', 'seed', 'answers');
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

// Split the full payload into the catalogue the app boots from and one
// answers file per topic. A question keeps everything but `answer` and
// `code_example` in the catalogue; those two land in the topic's answers
// file, in the same order, so the frontend can merge them back by id.
function split(payload) {
  const slugById = new Map(payload.topics.map((t) => [t.id, t.slug]));
  const answers = new Map();
  const questions = payload.questions.map((q) => {
    const { answer, code_example: codeExample, ...summary } = q;
    const slug = slugById.get(q.topic_id);
    if (!slug) throw new Error(`question ${q.id} belongs to unknown topic id ${q.topic_id}`);
    if (!answers.has(slug)) answers.set(slug, []);
    answers.get(slug).push({ id: q.id, answer, code_example: codeExample });
    return summary;
  });
  return {
    catalog: { topics: payload.topics, questions, roadmap: payload.roadmap },
    answers,
  };
}

// Every file the generator owns, as { relativePath: contents }, so writing
// and checking walk the same list.
function outputs(payload) {
  const { catalog, answers } = split(payload);
  const files = new Map();
  files.set(OUT_FILE, format(catalog));
  for (const [slug, rows] of answers) {
    files.set(path.join(ANSWERS_DIR, `${slug}.json`), format(rows));
  }
  return files;
}

// Answers files for topics that no longer exist would keep shipping stale
// content; they are removed on write and reported by --check.
function staleAnswerFiles(files) {
  if (!fs.existsSync(ANSWERS_DIR)) return [];
  return fs.readdirSync(ANSWERS_DIR)
    .filter((n) => n.endsWith('.json'))
    .map((n) => path.join(ANSWERS_DIR, n))
    .filter((p) => !files.has(p));
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
  const files = outputs(payload);
  const stale = staleAnswerFiles(files);
  const siteUrl = resolveSiteUrl();
  const sitemap = siteUrl ? buildSitemap(payload.topics, siteUrl) : null;

  if (checkMode) {
    const drifted = [...files].filter(([file, next]) => {
      const current = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
      return current !== next;
    }).map(([file]) => path.relative(ROOT, file));
    if (drifted.length || stale.length) {
      console.error(
        '✗ the static seed bundle is out of sync with backend/data/seed/.\n' +
        (drifted.length ? `  changed: ${drifted.slice(0, 5).join(', ')}${drifted.length > 5 ? ` (+${drifted.length - 5} more)` : ''}\n` : '') +
        (stale.length ? `  stale: ${stale.map((p) => path.relative(ROOT, p)).join(', ')}\n` : '') +
        '  Run: npm --prefix backend run generate:static-data',
      );
      process.exit(1);
    }
    console.log(`✓ static-data.json and ${files.size - 1} answers files are up to date`);
    return;
  }

  fs.mkdirSync(ANSWERS_DIR, { recursive: true });
  for (const [file, contents] of files) fs.writeFileSync(file, contents);
  for (const file of stale) fs.unlinkSync(file);
  console.log(`✓ wrote ${path.relative(ROOT, OUT_FILE)} — ${payload.topics.length} topics, ${payload.questions.length} questions, ${payload.roadmap.tracks.length} roadmap tracks`);
  console.log(`✓ wrote ${files.size - 1} answers files under ${path.relative(ROOT, ANSWERS_DIR)}/${stale.length ? ` (removed ${stale.length} stale)` : ''}`);

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

module.exports = { build, split, validateRoadmap };
