#!/usr/bin/env node
//
// Prerender SPA routes to static HTML for SEO. Run after `vite build`:
//
//   npm --prefix frontend run prerender
//
// The script:
//   1. Spins up `vite preview` in the background on port 4173.
//   2. Crawls a curated list of public routes with Puppeteer (home, the four
//      platform landings, /pricing, /contact, every /topic/<slug>, every
//      /topic/<slug>/cheatsheet).
//   3. Captures the post-hydration HTML and writes it to
//      dist/<route>/index.html so GitHub Pages serves a fully-rendered page
//      to crawlers — Google's bot does run JS, but Twitter / Slack / LinkedIn
//      unfurlers don't, and prerender lets them see the right meta + content.
//   4. The SPA fallback (dist/404.html) is left in place for unknown deeper
//      routes — React Router handles them on hydrate.
//
// What we DON'T prerender:
//   - /admin and /admin/authoring (auth-gated; the prerender output would be
//     a "not authorized" panel, which leaks nothing useful for SEO and
//     pollutes the index).
//   - /search, /study, /mock, /round, /bookmarks, /stats — interactive app
//     surfaces, no SEO value, and they rely on user state.
//   - /login, /signup — auth flows; deliberately ephemeral.
//
// Hydration mismatch is acceptable: the prerendered DOM gives the crawler the
// content it needs, and React re-renders on first paint without breaking
// functionality. We don't ship a real SSR runtime.

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const STATIC_DATA = path.join(DIST, 'seed', 'static-data.json');
const PORT = Number(process.env.PRERENDER_PORT) || 4173;
const BASE = process.env.PRERENDER_BASE || '';
const HOST = `http://localhost:${PORT}${BASE}`;
// Production site URL substituted into canonical / og:url / og:image links
// after rendering. Falls back to deriving from GITHUB_REPOSITORY in CI so
// Pages deploys end up with correct absolute URLs without manual config.
function resolveSiteUrl() {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/+$/, '');
  const repo = process.env.GITHUB_REPOSITORY;
  if (repo && repo.includes('/')) {
    const [owner, name] = repo.split('/');
    return `https://${owner.toLowerCase()}.github.io/${name}`;
  }
  return null;
}
const SITE_URL = resolveSiteUrl();

let puppeteer;
try {
  puppeteer = require('puppeteer');
} catch (err) {
  console.error('✗ puppeteer is not installed. Run: npm --prefix frontend install --save-dev puppeteer');
  process.exit(1);
}

function readStaticData() {
  if (!fs.existsSync(STATIC_DATA)) {
    throw new Error(
      `Missing ${path.relative(ROOT, STATIC_DATA)} — run vite build (which copies frontend/public/) before prerender.`,
    );
  }
  return JSON.parse(fs.readFileSync(STATIC_DATA, 'utf8'));
}

function buildRouteList(staticData) {
  return [
    '/',
    '/flutter', '/ios', '/android', '/kmp',
    '/pricing',
    '/contact',
    ...staticData.topics.map((t) => `/topic/${t.slug}`),
    ...staticData.topics.map((t) => `/topic/${t.slug}/cheatsheet`),
  ];
}

function startPreviewServer() {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      'npx',
      ['vite', 'preview', '--port', String(PORT), '--strictPort'],
      { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] },
    );
    let resolved = false;
    proc.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      // Vite prints "Local: http://localhost:4173/" once ready.
      if (!resolved && /Local:\s+http/i.test(text)) {
        resolved = true;
        resolve(proc);
      }
    });
    proc.stderr.on('data', (chunk) => process.stderr.write(`[preview] ${chunk}`));
    proc.on('exit', (code) => {
      if (!resolved) reject(new Error(`vite preview exited (code ${code}) before starting`));
    });
    setTimeout(() => {
      if (!resolved) reject(new Error('vite preview did not start within 30s'));
    }, 30_000);
  });
}

function writeHtml(route, html) {
  const cleanRoute = route === '/' ? '' : route.replace(/\/+$/, '');
  const outDir = path.join(DIST, cleanRoute);
  fs.mkdirSync(outDir, { recursive: true });
  // Rewrite the localhost dev origin baked into canonical / og:url /
  // og:image attributes (set client-side via window.location.origin) to the
  // production SITE_URL. Without this, crawlers index localhost and Slack
  // unfurls 404.
  let final = html;
  if (SITE_URL) {
    final = final.replace(new RegExp(`http://localhost:${PORT}`, 'g'), SITE_URL);
  }
  fs.writeFileSync(path.join(outDir, 'index.html'), final);
}

// Wait until the React app has finished hydrating its first data fetch.
// `networkidle0` is too aggressive (PWA service worker can keep traffic
// flowing); instead we wait for either the topic list to render or a
// short bail-out timeout — the post-hydration DOM is what we want either way.
async function waitForReady(page) {
  await page.waitForFunction(
    () => {
      // Either the dashboard topic-grid rendered or any text content
      // beyond the boot shell exists.
      const tiles = document.querySelectorAll('article, h1, h2');
      const root = document.getElementById('root');
      return tiles.length > 1 || (root && root.innerText.trim().length > 50);
    },
    { timeout: 8000 },
  ).catch(() => null); // best-effort; if we time out, still capture what we have
}

async function main() {
  const staticData = readStaticData();
  const routes = buildRouteList(staticData);
  console.log(`▶︎  prerender ${routes.length} routes via ${HOST}`);
  if (SITE_URL) {
    console.log(`   canonicalising as ${SITE_URL}`);
  } else {
    console.log('   (no SITE_URL / GITHUB_REPOSITORY — canonicals stay on localhost; set SITE_URL for prod)');
  }

  const preview = await startPreviewServer();
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(20_000);

    for (const route of routes) {
      const url = `${HOST}${route}`;
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        await waitForReady(page);
        const html = await page.content();
        writeHtml(route, html);
        console.log(`✓ ${route}`);
      } catch (err) {
        console.warn(`✗ ${route}: ${err.message}`);
      }
    }
  } finally {
    try { await browser?.close(); } catch { /* ignore */ }
    preview.kill('SIGTERM');
  }
}

main().catch((err) => {
  console.error('✗ prerender failed:', err);
  process.exit(1);
});
