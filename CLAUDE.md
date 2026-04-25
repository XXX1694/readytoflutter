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
- Smoke test (used by CI): `node -e "const db=require('./database');db.init();console.log('topics=',db.getTopics().length);"`

Frontend (`cd frontend`):
- `npm install`
- `npm run dev` — Vite dev server on :3000, proxies `/api` → `http://localhost:3001`
- `npm run build` — production build to `frontend/dist`
- `npm run preview` — preview the built bundle

Both at once:
- `./start.sh` from the repo root (kills stale `node server.js` and `vite` processes first, then starts both).

There is no test runner and no linter configured in either package.

## Architecture

### Data flow

The frontend is designed to work in **two modes** and chooses at runtime per request:

1. **API mode** — `frontend/src/api/api.js` calls the Express backend via axios at `VITE_API_BASE_URL` (or `/api` via the dev proxy).
2. **Static fallback mode** — every API call is wrapped in `tryRemote(remote, fallback)`. If the remote call throws, it falls back to `fallbackGet*` functions that load `frontend/public/seed/static-data.json` and read/write progress in `localStorage` under `readytoflutter_progress_v1`.

This is why the GitHub Pages deployment works without a backend: the static bundle ships with `static-data.json` and progress is per-browser. When changing API behavior, **update both the Express handler and the corresponding `fallback*` function** — otherwise the Pages build silently diverges from local dev.

### Backend

- `backend/server.js` — thin route layer. All logic delegates to `database.js`.
- `backend/database.js` — opens `data/interview.db` (better-sqlite3, WAL mode). On `init()`:
  1. Creates `topics`, `questions`, `progress` tables if missing.
  2. Seeds from `data/seed/topics.json` + `data/seed/questions/*.json` only if `topics` is empty.
  3. Runs `removeGeneralQuestions()` (drops rows with `order_index >= 100`) and `normalizeExistingQuestions()` (rewrites scenario-style prompts into direct interview questions) on every startup. These run unconditionally — keep them idempotent.
- Seed JSON is split per-topic under `backend/data/seed/questions/NN-name.json`; `database.js` reads them sorted by filename and concatenates.
- The SQLite file lives in `backend/data/`. On Render this path is a mounted persistent disk (`render.yaml`).
- CORS: open by default. Set `FRONTEND_ORIGIN` env var to restrict.

### Frontend — "Codex" design system

- React 18 + React Router v6 + Tailwind, with a custom design system layered on top. **All new UI should use Codex tokens, not raw slate/blue Tailwind colors.**
- **Tokens** live as CSS variables in `src/index.css` (light + `.dark`) and surface as Tailwind utilities (`bg-paper`, `text-ink`, `border-rule`, `bg-brand`, `text-mint`, etc.). Hard-shadow utilities `shadow-codex(-sm/-lg)` are the brutalist signature; pair with `border-1.5 border-ink`.
- **Fonts** are self-hosted via `@fontsource-variable` (Fraunces display, Inter sans, JetBrains Mono). Use `font-display` for headlines, `font-mono` for eyebrows/labels.
- **UI kit** at `src/ui/` (Button, Card, Pill, ProgressBar, Eyebrow, IconButton, Spinner) wraps `cva` variants. Compose with the `cn()` helper in `src/lib/cn.js` (`clsx + tailwind-merge`).
- **Data layer**: TanStack Query hooks in `src/lib/queries.js` wrap the dual-mode `api.js`. Always invalidate after mutations (see `useUpdateProgress`).
- **Global UI state** lives in Zustand at `src/store/prefs.js` (theme, sidebar, topic filter, command palette). Theme is hydrated synchronously on import to avoid FOUC.
- **i18n**: `i18n/LangContext.jsx` provides `{lang, setLang}` (en/ru). UI strings in `i18n/ui.js`; question/answer translations in `content.js` / `contentRu.js`. Search index (MiniSearch) is rebuilt against the active language.
- **Routing**: `BrowserRouter basename={import.meta.env.BASE_URL}` so the same build works at `/` and `/<repo>/`. Pages are lazy-loaded in `App.jsx`; use `FullPageLoader` from `src/ui` as the Suspense fallback.
- **Code-splitting**: `vite.config.js` has manual chunks for `shiki`, `motion`, `radix`, `tanstack`. Adjust there when adding new heavy deps.
- **Routes**: `/` (Dashboard with `DueWidget` + `ActivityHeatmap` + topic grid) · `/topic/:slug` · `/search` · `/study` (SRS flashcards).
- **Code highlighting**: Shiki via `src/lib/highlighter.js` (lazy, languages loaded on demand). The `<CodeBlock>` component handles theme switching.
- **Command palette** (`CommandPalette.jsx`): bound to ⌘K / Ctrl+K via `react-hotkeys-hook`. ⌘S jumps to study. Add new commands inside its existing `Command.Group`s.
- **Toaster**: Sonner mounted in `Layout.jsx`. Surface mutation errors via `toast.error(...)`.
- **SRS**: `src/lib/srs.js` is a SuperMemo SM-2 engine over `localStorage['rtf:srs:v1']`. `pickDueQueue` builds bounded study sessions; `getSrsSummary` powers the dashboard widget. Per-card state is independent of the question-progress store.
- **Activity heatmap**: `src/lib/activity.js` derives streaks from the existing `progress.updated_at` timestamps in localStorage.
- **PWA**: `vite-plugin-pwa` generates `sw.js` on build with offline precaching of static-data + fonts. Bump `maximumFileSizeToCacheInBytes` if Shiki bundles grow.
- `ErrorBoundary` wraps the entire router in `App.jsx`.

### Deployment

- Frontend → GitHub Pages via `.github/workflows/deploy-frontend-pages.yml`. The workflow copies `dist/index.html` to `404.html` for SPA fallback. Set `VITE_API_BASE_URL` as a repo **Variable** (not Secret) to point at a real backend; leave it empty to ship the Pages-only static-fallback build.
- Backend → Render via `render.yaml` (Blueprint) or a manual service. `.github/workflows/deploy-backend-render.yml` pings `RENDER_DEPLOY_HOOK_URL` on pushes that touch `backend/**`.
- CI (`.github/workflows/ci.yml`) builds the frontend and runs the backend smoke test on every push/PR.

## Conventions

- Question ordering: `order_index` controls display order. Values `>= 100` are treated as "general/scenario" questions and are deleted on startup — don't reuse that range.
- Progress storage diverges by mode: server writes to the `progress` table; static-fallback writes to `localStorage`. There is no sync between them.
- When adding a new API endpoint, mirror the contract in `frontend/src/api/api.js` (both the remote call and a `fallback*` implementation against `static-data.json` + `localStorage`).
- When adding seed questions, drop a new `data/seed/questions/NN-name.json` file; numeric prefix determines load order. The DB only re-seeds when empty, so to pick up changes locally either delete `backend/data/interview.db*` or write a migration.
