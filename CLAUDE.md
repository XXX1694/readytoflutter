# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

Two-package monorepo (no workspace tooling) with independent `package.json` files:

- `backend/` — Express + better-sqlite3 API on port 3001
- `frontend/` — Vite + React 18 SPA on port 3000

There is no root `package.json`. Always `cd` into the package you're working on, or use `start.sh` from the repo root to launch both.

## Common commands

Backend (`cd backend`):
- `npm install` — install dependencies
- `npm start` — run server (`node server.js`)
- `npm run dev` — run with `node --watch` for auto-reload
- `npm run generate:static-data` — regenerate `frontend/public/seed/static-data.json` from `backend/data/seed/*.json`. Run this after editing seed JSON.
- Smoke test (used by CI): `node -e "const db=require('./database');db.init();console.log('topics=',db.getTopics().length);db.close();"`

Frontend (`cd frontend`):
- `npm install`
- `npm run dev` — Vite dev server on :3000, proxies `/api` → `http://localhost:3001`
- `npm run lint` — ESLint flat config (catches hook deps + obvious bugs; style-only rules are off)
- `npm run test` — Vitest unit tests (currently cover `srs.js` + `roundBuilder.js`)
- `npm run build` — production build to `frontend/dist`
- `npm run preview` — preview the built bundle

Both at once:
- `./start.sh` from the repo root (auto-installs missing `node_modules`, tracks PIDs of the children it spawns, cleans up on Ctrl+C — never `pkill`s globally).

## Architecture

### Data flow

The frontend is designed to work in **two modes** and chooses at runtime per request:

1. **API mode** — `frontend/src/api/api.js` calls the Express backend via axios at `VITE_API_BASE_URL` (or `/api` via the dev proxy).
2. **Static fallback mode** — every API call is wrapped in `tryRemote(remote, fallback)`. If the remote call throws, it falls back to `fallbackGet*` functions that load `frontend/public/seed/static-data.json` and read/write progress in `localStorage` under `readytoflutter_progress_v1`.

This is why the GitHub Pages deployment works without a backend: the static bundle ships with `static-data.json` and progress is per-browser. When changing API behavior, **update both the Express handler and the corresponding `fallback*` function** — otherwise the Pages build silently diverges from local dev.

### Backend

- `backend/server.js` — thin route layer. All logic delegates to `database.js`. Mounts `helmet` (CSP off — JSON-only API; HSTS in prod), CORS (locked to `FRONTEND_ORIGIN` if set, else permissive), `express.json({ limit: '256kb' })`, a per-request id middleware (logged on errors for correlation), and `auth.attach(app)` which wires `/api/auth/*` routes. Trusts proxy (`X-Forwarded-*`) only in production. Reads use `auth.optionalAuth` + `readLimiter`; writes (`/api/progress/*`) go through `writeLimiter` + `auth.requireAuth`. There's also an `/api` 404 handler and a structured error handler that logs `reqId method path userId`. Graceful shutdown on SIGTERM/SIGINT closes the SQLite handle cleanly with a 10s drain — important for Render redeploys so WAL files don't end up half-written.
- `backend/config.js` — central constants: rate-limit windows + caps (`READ_*`, `WRITE_*`, `AUTH_*`), `MAX_NOTES_LEN`, `BULK_MAX_ITEMS`, `BCRYPT_ROUNDS`. Edit here, not in callsites.
- `backend/auth.js` — JWT (bcryptjs + jsonwebtoken + zod). `JWT_SECRET` env is required in prod; in dev it auto-persists a random secret to `backend/data/.jwt-secret` so tokens survive restarts. Default expiry 7d (`JWT_EXPIRES_IN`). Exports `attach`, `requireAuth`, `optionalAuth`. Email login + bcrypt rounds = 11. Auth-window rate limit lives in `config.js` (10 attempts / 15 min by default).
- `backend/database.js` — opens `data/interview.db` (better-sqlite3, WAL mode). On `init()`:
  1. Creates `topics`, `questions`, `progress`, `users`, `migrations` tables if missing.
  2. Migrates legacy single-user `progress` table to `(user_id, question_id)` composite PK; pre-auth rows are preserved under `user_id = 0` (legacy archive). Index `idx_progress_user` powers per-user reads.
  3. Seeds from `data/seed/topics.json` + `data/seed/questions/*.json` only if `topics` is empty.
  4. Runs one-shot data cleanups (`removeGeneralQuestions`, `normalizeExistingQuestions`, `stripTopicIcons`, `dropKnownDuplicates`) via the `runOnce` migration tracker — each writes a row into `migrations` after success and never runs twice. **If you add a new one-shot cleanup, register it via `runOnce('name', fn)` so it doesn't churn on every startup.**
- Other DB exports: `db.ping()` (used by `/healthz` to confirm SQLite is responsive — Render healthcheck), `db.questionExists(id)` (used by `POST /api/progress/:questionId` to reject bogus ids with 404), `db.close()` (called from the graceful-shutdown path).
- Seed JSON is split per-topic under `backend/data/seed/questions/NN-name.json`; `database.js` reads them sorted by filename and concatenates.
- `backend/scripts/generate-static-data.js` — single source of truth for `frontend/public/seed/static-data.json`. Mirrors the same filters the DB applies (`order_index < 100`, `KNOWN_DUPLICATE_IDS`, `icon = ''`). Run via `npm run generate:static-data`. Pass `--check` to fail if the file is out of sync (CI uses this).
- The SQLite file lives in `backend/data/`. On Render this path is a mounted persistent disk (`render.yaml`). The `.jwt-secret` lives alongside it so the disk is the source of truth.
- Env: see `backend/.env.example`. Key vars: `PORT`, `NODE_ENV`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `FRONTEND_ORIGIN`.

### Frontend — "Codex" design system

- React 18 + React Router v6 + Tailwind, with a custom design system layered on top. **All new UI should use Codex tokens, not raw slate/blue Tailwind colors.**
- **Tokens** live as CSS variables in `src/index.css` (light + `.dark`) and surface as Tailwind utilities (`bg-paper`, `text-ink`, `border-rule`, `bg-brand`, `text-mint`, etc.). Hard-shadow utilities `shadow-codex(-sm/-lg)` are the brutalist signature; pair with `border-1.5 border-ink`.
- **Fonts** are self-hosted via `@fontsource-variable` (Fraunces display, Inter sans, JetBrains Mono). Use `font-display` for headlines, `font-mono` for eyebrows/labels.
- **UI kit** at `src/ui/` (Button, Card, Pill, ProgressBar, Eyebrow, IconButton, Spinner) wraps `cva` variants. Compose with the `cn()` helper in `src/lib/cn.js` (`clsx + tailwind-merge`).
- **Data layer**: TanStack Query hooks in `src/lib/queries.js` wrap the dual-mode `api.js`. `useUpdateProgress` is the canonical write path — it does an **optimistic patch** of the cached topic when given `topicSlug`, rolls back on error, and on success invalidates only the affected topic + stats (the topics-list is marked stale without refetching). Always pass `topicSlug` when calling `mutateAsync`; without it, falls back to broad invalidation.
- **Auth**: `src/store/auth.js` (Zustand + persist) is the session source of truth. `api.js` attaches `Authorization: Bearer <token>` per request and on 401 clears both the session and the TanStack Query cache. The backend probe (`/api/auth/health`) runs **once on app boot from `App.jsx`** — not lazily on first AccountMenu interaction — so `backendAvailable` is settled before first paint. When false (Pages build), all auth UI hides itself. Login auto-merges any localStorage progress to the server via `bulkSyncProgress`; the server upserts last-write-wins by `updated_at` so it never clobbers fresher rows. Helpers: `serializeLocalProgress` in `api.js` is the canonical translator from localStorage shape → bulk payload (used by both Login and Signup).
- **Static fallback caching**: `loadStaticData()` in `api.js` memoizes the fetched JSON for **1 hour** (TTL). Call `invalidateStaticData()` to force a refetch — useful after admin edits or sign-in where server data may now differ from the baked seed.
- **Global UI state** lives in Zustand at `src/store/prefs.js` (theme, sidebar, topic filter, command palette). Theme is hydrated synchronously on import to avoid FOUC. The admin editor uses a separate Zustand store at `src/store/admin.js` that holds a local diff (`edits` / `adds` / `deletes`) over the read-only base data — apply via `applyDiff` for reads, never mutate the base array.
- **i18n**: `i18n/LangContext.jsx` provides `{lang, setLang}` (en/ru). UI strings in `i18n/ui.js`; question/answer translations in `content.js` / `contentRu.js`. Search index (MiniSearch) is rebuilt against the active language.
- **Routing**: `BrowserRouter basename={import.meta.env.BASE_URL}` so the same build works at `/` and `/<repo>/`. Pages are lazy-loaded in `App.jsx`; use `FullPageLoader` from `src/ui` as the Suspense fallback. The full route map: `/` (dashboard), `/topic/:slug`, `/search`, `/study` (SRS), `/mock`, `/round/:slug`, `/bookmarks`, `/admin`, `/stats`, `/knowledge`, `/settings`, `/login`, `/signup`, plus standalone `/topic/:slug/print` and `/topic/:slug/cheatsheet` which sit **outside the Layout** (registered before the Layout block) so printing isn't constrained by the app's `h-screen overflow-hidden`.
- **Code-splitting**: `vite.config.js` has manual chunks for `shiki`, `motion`, `radix`, `tanstack`. Adjust there when adding new heavy deps.
- **Code highlighting**: Shiki via `src/lib/highlighter.js` (lazy, languages loaded on demand). The `<CodeBlock>` component handles theme switching.
- **Command palette** (`CommandPalette.jsx`): bound to ⌘K / Ctrl+K via `react-hotkeys-hook`. ⌘S jumps to study. Add new commands inside its existing `Command.Group`s.
- **Toaster**: Sonner mounted in `Layout.jsx`. Surface mutation errors via `toast.error(...)`.
- **SRS**: `src/lib/srs.js` is a SuperMemo SM-2 engine over `localStorage['rtf:srs:v1']`. `pickDueQueue` builds bounded study sessions; `getSrsSummary` powers the dashboard widget. Per-card state is independent of the question-progress store.
- **Activity heatmap**: `src/lib/activity.js` derives streaks from the existing `progress.updated_at` timestamps in localStorage.
- **Other lib modules**: `roundBuilder.js` clusters topic questions into 5-question interview rounds; `bookmarks.js` + `useBookmark.js` manage starred questions in localStorage; `hint.js` powers the hint-ladder reveal; `knowledge.js` backs the `/knowledge` page; `exportData.js` does Markdown/JSON export; `youtube.js` resolves video embeds; `speech.js` + `tts.js` drive the voice input button (Web Speech API) and answer read-aloud.
- **Mobile**: `BottomNav.jsx` swaps in on narrow viewports; the sidebar becomes a drawer. Honor `safe-area-inset-*` when adding fixed-position UI.
- **PWA**: `vite-plugin-pwa` generates `sw.js` on build with offline precaching of static-data + fonts. Bump `maximumFileSizeToCacheInBytes` if Shiki bundles grow.
- `ErrorBoundary` wraps the entire router in `App.jsx`.

### Deployment

- Frontend → GitHub Pages via `.github/workflows/deploy-frontend-pages.yml`. The workflow copies `dist/index.html` to `404.html` for SPA fallback. Set `VITE_API_BASE_URL` as a repo **Variable** (not Secret) to point at a real backend; leave it empty to ship the Pages-only static-fallback build.
- Backend → Render via `render.yaml` (Blueprint) or a manual service. `.github/workflows/deploy-backend-render.yml` pings `RENDER_DEPLOY_HOOK_URL` on pushes that touch `backend/**`.
- CI (`.github/workflows/ci.yml`) builds the frontend and runs the backend smoke test on every push/PR.

## Conventions

- Question ordering: `order_index` controls display order. Values `>= 100` are treated as "general/scenario" questions and are deleted on first init via the `runOnce` migration tracker — don't reuse that range.
- Progress storage diverges by mode: server writes to the `progress` table keyed by `(user_id, question_id)`; static-fallback writes to `localStorage` under `readytoflutter_progress_v1`. On login, local progress is automatically uploaded to the server via `bulkSyncProgress` (server does last-write-wins by `updated_at`).
- When adding a new API endpoint, mirror the contract in `frontend/src/api/api.js` (both the remote call and a `fallback*` implementation against `static-data.json` + `localStorage`). Writes on the server need `auth.requireAuth` + `writeLimiter`; reads typically use `auth.optionalAuth` + `readLimiter`.
- When adding seed questions, drop a new `data/seed/questions/NN-name.json` file; numeric prefix determines load order. The DB only re-seeds when empty, so to pick up changes locally either delete `backend/data/interview.db*` or write a migration. **After changing seed data, run `npm --prefix backend run generate:static-data`** — CI's `static-data-sync` job (and the Pages deploy workflow) verifies/regenerates this automatically.
- localStorage keyspace conventions: `rtf:auth:v1` (session), `rtf:srs:v1` (SRS cards), `readytoflutter_progress_v1` (fallback progress), `rtf:admin:diff:v1` (admin local edits). Bump the version suffix instead of mutating an existing schema.
- ESLint flat config in `frontend/eslint.config.js` keeps the strict react-hooks v7 "compiler" rules (`set-state-in-effect`, `purity`, `preserve-manual-memoization`, `refs`) at **warn** level — they flag legitimate existing patterns. New code should aim for zero warnings; existing warnings are tracked tech debt, not bugs.
