#!/usr/bin/env node
//
// Route smoke test. Loads every public route of the built (or dev) app in an
// isolated anonymous session — the backend is blocked, so the app runs on the
// static bundle plus localStorage, exactly like the GitHub Pages deploy — and
// fails on anything a redesign is likely to break silently:
//
//   - a page error or console error (aborted /api/ calls are expected and ignored)
//   - a page with no <h1> (the prerender readiness contract)
//   - the ErrorBoundary fallback
//   - horizontal overflow at 360px (DESIGN.md's responsive floor)
//
// Screenshots land in frontend/.smoke/<viewport>-<theme>-<lang>/ for review.
//
//   npm run smoke                        # against http://localhost:3000 (vite dev)
//   SMOKE_URL=http://localhost:4173 npm run smoke   # against `vite preview`
//
// The base path is inferred the same way vite.config.js infers it (VITE_BASE_PATH,
// else /<repo>/ inside GitHub Actions, else /).

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, '.smoke');
const BASE_URL = (process.env.SMOKE_URL || 'http://localhost:3000').replace(/\/+$/, '');

function detectBasePath() {
  if (process.env.VITE_BASE_PATH) return process.env.VITE_BASE_PATH;
  const repo = process.env.GITHUB_REPOSITORY;
  if (process.env.GITHUB_ACTIONS === 'true' && repo && repo.includes('/')) return `/${repo.split('/')[1]}/`;
  return '/';
}
const BASE_PATH = detectBasePath().replace(/\/$/, '');

const ROUTES = [
  '/', '/roadmap', '/topics', '/topic/dart-basics', '/topic/dart-basics?q=3',
  '/study', '/mock', '/live', '/round/dart-basics', '/knowledge', '/stats', '/bookmarks',
  '/search?q=widget', '/settings', '/login', '/signup', '/reset', '/pricing', '/contact',
  '/flutter', '/nope', '/topic/dart-basics/cheatsheet', '/topic/dart-basics/print',
];

// Four combinations cover both viewports, both themes and both languages.
const COMBOS = [
  { width: 360, height: 780, theme: 'light', lang: 'en' },
  { width: 360, height: 780, theme: 'dark', lang: 'ru' },
  { width: 1280, height: 860, theme: 'light', lang: 'en' },
  { width: 1280, height: 860, theme: 'dark', lang: 'ru' },
];

// Routes that legitimately render without the app shell or without an <h1>.
const NO_H1 = new Set([]);

const slug = (route) => route.replace(/^\//, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'home';

async function seed(page, combo) {
  await page.goto(`${BASE_URL}${BASE_PATH}/`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(async (opts) => {
    localStorage.setItem('rtf:stackpicker:v1', '1');
    localStorage.setItem('rtf:welcome:v1', '1');
    localStorage.setItem('rtf:cmdk:hint:dismissed:v1', '1');
    localStorage.setItem('rtf:pwa:visit-count', '5');
    // The theme lives in the persisted prefs store, not the legacy `theme`
    // key (which nothing reads any more) — without this the "dark" combos
    // silently rendered light.
    const prefsKey = 'rtf:prefs:v1';
    let prefs;
    try { prefs = JSON.parse(localStorage.getItem(prefsKey) || ''); } catch { prefs = null; }
    if (!prefs || typeof prefs !== 'object') prefs = { state: {}, version: 0 };
    prefs.state = { ...(prefs.state || {}), theme: opts.theme };
    localStorage.setItem(prefsKey, JSON.stringify(prefs));
    localStorage.setItem('lang', opts.lang);
    // A little progress so progress-dependent states render rather than empty ones.
    const res = await fetch(`${opts.base}/seed/static-data.json`);
    const d = await res.json();
    const first = d.questions.slice(0, 20);
    const now = Date.now();
    const progress = {};
    first.forEach((q, i) => { progress[q.id] = { status: 'completed', notes: null, updated_at: new Date(now - (i % 5) * 86400000).toISOString() }; });
    localStorage.setItem('readytoflutter_progress_v1', JSON.stringify(progress));
    const srs = {};
    first.slice(0, 6).forEach((q, i) => { srs[q.id] = { ease: 2.3, interval: 1 + i, reps: 1, dueAt: now - 3600000, lastAt: now - 86400000 }; });
    localStorage.setItem('rtf:srs:v1', JSON.stringify(srs));
    localStorage.setItem('rtf:bookmarks:v1', JSON.stringify([first[0].id, first[1].id]));
  }, { theme: combo.theme, lang: combo.lang, base: BASE_PATH });
}

async function main() {
  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const failures = [];
  let checked = 0;
  const started = Date.now();

  for (const combo of COMBOS) {
    const label = `${combo.width}-${combo.theme}-${combo.lang}`;
    const dir = path.join(OUT_DIR, label);
    fs.mkdirSync(dir, { recursive: true });
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    await page.setViewport({ width: combo.width, height: combo.height });
    await page.setRequestInterception(true);
    page.on('request', (r) => (new URL(r.url()).pathname.startsWith('/api/') ? r.abort() : r.continue()));
    await page.evaluateOnNewDocument(() => { window.print = () => {}; });
    await seed(page, combo);

    for (const route of ROUTES) {
      const problems = [];
      const onPageError = (e) => problems.push(`pageerror: ${String(e).slice(0, 200)}`);
      const onConsole = (m) => {
        if (m.type() !== 'error') return;
        const text = m.text();
        if (/ERR_FAILED|net::|Failed to load resource/.test(text)) return;
        problems.push(`console: ${text.slice(0, 200)}`);
      };
      page.on('pageerror', onPageError);
      page.on('console', onConsole);
      try {
        await page.goto(`${BASE_URL}${BASE_PATH}${route}`, { waitUntil: 'networkidle0', timeout: 30000 });
        await new Promise((r) => setTimeout(r, 500));
        const state = await page.evaluate(() => {
          const main = document.querySelector('main');
          return {
            h1: Boolean(document.querySelector('h1')),
            boundary: /Something broke|Что-то пошло не так/.test(document.body.innerText),
            docOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
            mainOverflow: main ? main.scrollWidth > main.clientWidth + 1 : false,
            text: document.body.innerText.trim().length,
          };
        });
        if (!state.h1 && !NO_H1.has(route)) problems.push('no <h1>');
        if (state.boundary) problems.push('ErrorBoundary fallback rendered');
        if (state.docOverflow || state.mainOverflow) problems.push(`horizontal overflow at ${combo.width}px`);
        if (state.text < 40) problems.push('page is (nearly) blank');
        await page.screenshot({ path: path.join(dir, `${slug(route)}.png`) });
      } catch (err) {
        problems.push(`navigation failed: ${err.message.slice(0, 200)}`);
      }
      page.off('pageerror', onPageError);
      page.off('console', onConsole);
      checked += 1;
      if (problems.length) {
        failures.push({ combo: label, route, problems });
        console.log(`✗ ${label} ${route}\n    ${problems.join('\n    ')}`);
      } else {
        console.log(`✓ ${label} ${route}`);
      }
    }
    await context.close();
  }
  await browser.close();

  const secs = Math.round((Date.now() - started) / 1000);
  console.log(`\n${checked} page loads in ${secs}s · ${failures.length} failing · screenshots in ${path.relative(ROOT, OUT_DIR)}/`);
  if (failures.length) process.exit(1);
}

main().catch((err) => {
  console.error('✗ smoke failed:', err);
  process.exit(1);
});
