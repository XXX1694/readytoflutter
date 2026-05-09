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

// Wait until `vite preview` is ready to serve.
//
// Two independent ready signals, OR'd together. CI run #43 showed why both
// matter:
//   - The previous regex match on each chunk in isolation FAILED there even
//     though Vite did print "Local: http://...", because the line arrived
//     across multiple `data` events ("...Local:" then "   http://..."). We
//     now buffer all output and re-test the buffer on every chunk.
//   - The HTTP probe is the belt-and-braces backup, hitting 127.0.0.1 *and*
//     ::1 (Node's getaddrinfo can resolve localhost to either, and Vite may
//     bind to only one) at both `/` and the BASE path Vite is serving.
//
// CI cold-starts can take 60s+ because npx has to download Vite. Bumping
// the bounded timeout to 180s gives runners with a cold cache headroom.
function startPreviewServer() {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      'npx',
      ['vite', 'preview', '--port', String(PORT), '--strictPort'],
      { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] },
    );
    let resolved = false;
    let buf = '';
    const ready = () => {
      if (resolved) return;
      resolved = true;
      clearInterval(pollTimer);
      clearTimeout(timeout);
      resolve(proc);
    };

    const onChunk = (chunk) => {
      const text = chunk.toString();
      process.stderr.write(`[preview] ${text}`);
      if (resolved) return;
      // Keep last 4KB; "Local: http://..." line is well within that and the
      // bound prevents unbounded growth from Vite's progress chatter.
      buf = (buf + text).slice(-4096);
      const m = buf.match(/Local:\s+(http:\/\/[^\s/]+(?:\/[^\s]*)?)/i);
      if (m) {
        // Capture the actual base path Vite serves so the HTTP probe targets
        // the right URL. Falls back to "/" if no match.
        const url = new URL(m[1]);
        servedPath = url.pathname || '/';
        ready();
      }
    };
    proc.stdout.on('data', onChunk);
    proc.stderr.on('data', onChunk);
    proc.on('exit', (code) => {
      if (!resolved) reject(new Error(`vite preview exited (code ${code}) before starting`));
    });

    // HTTP probe — fires every 500ms. Tries multiple host/path combos so a
    // single binding mismatch (IPv6-only resolution, base-path 404) doesn't
    // sink the readiness signal.
    let servedPath = '/';
    const probeOnce = (host, path) => {
      const req = require('http').request(
        { host, port: PORT, path, method: 'GET', timeout: 1500 },
        (res) => { res.resume(); ready(); },
      );
      req.on('error', () => {});
      req.on('timeout', () => req.destroy());
      req.end();
    };
    const pollTimer = setInterval(() => {
      if (resolved) return;
      // Default Vite base on Pages is `/<repo>/`; probing both `/` and the
      // detected base catches either binding.
      for (const host of ['127.0.0.1', '::1', 'localhost']) {
        probeOnce(host, servedPath);
        if (servedPath !== '/') probeOnce(host, '/');
      }
    }, 500);

    const timeout = setTimeout(() => {
      if (!resolved) {
        clearInterval(pollTimer);
        reject(new Error('vite preview did not start within 180s'));
      }
    }, 180_000);
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
    // Run a small pool of parallel pages within the same browser context.
    // Sequential prerender (113 routes × ~3s/page) blew past the 10-minute
    // CI job timeout on commit d0ffa3a. With concurrency = 6 the whole
    // batch finishes in ~2 minutes, comfortably inside the budget.
    const CONCURRENCY = Number(process.env.PRERENDER_CONCURRENCY) || 6;
    const queue = routes.slice();
    let done = 0;
    const total = queue.length;
    const startedAt = Date.now();

    const worker = async (workerId) => {
      const page = await browser.newPage();
      page.setDefaultNavigationTimeout(30_000);
      try {
        while (queue.length > 0) {
          const route = queue.shift();
          if (!route) break;
          const url = `${HOST}${route}`;
          try {
            await page.goto(url, { waitUntil: 'domcontentloaded' });
            await waitForReady(page);
            const html = await page.content();
            writeHtml(route, html);
            done += 1;
            console.log(`✓ ${route}  (${done}/${total})`);
          } catch (err) {
            done += 1;
            console.warn(`✗ ${route}: ${err.message}  (${done}/${total})`);
          }
        }
      } finally {
        try { await page.close(); } catch { /* ignore */ }
      }
    };

    await Promise.all(
      Array.from({ length: Math.min(CONCURRENCY, total) }, (_, i) => worker(i)),
    );
    console.log(`▼ prerender done in ${Math.round((Date.now() - startedAt) / 1000)}s (concurrency=${CONCURRENCY})`);
  } finally {
    try { await browser?.close(); } catch { /* ignore */ }
    preview.kill('SIGTERM');
  }
}

main().catch((err) => {
  console.error('✗ prerender failed:', err);
  process.exit(1);
});
