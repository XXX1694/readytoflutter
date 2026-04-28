# Contributing

Thanks for taking the time to look at this. The repo is small enough that
this guide is short — a checklist, not a process.

## Repo shape

Two packages, no workspace tooling:

- `backend/` — Express + SQLite (better-sqlite3, WAL mode), port 3001.
- `frontend/` — Vite + React 18 SPA, port 3000.

There is no root `package.json`. `cd` into the package you're working on,
or run `./start.sh` from the repo root for both at once.

## Local setup

```bash
# Backend
cd backend && npm install && npm run dev

# Frontend (in another shell)
cd frontend && npm install && npm run dev
```

Open http://localhost:3000.

## Quality gates

Run these before opening a PR — CI runs the same:

```bash
# Frontend
cd frontend
npm run lint    # ESLint flat config
npm run test    # Vitest — unit tests for srs / roundBuilder
npm run build   # Production build (also runs in deploy)

# Backend
cd backend
node -e "const db=require('./database');db.init();db.close();"   # smoke test
```

## Editing seed questions

The single biggest source of dev/prod drift in this repo is the static
fallback bundle that ships to GitHub Pages.

After **any** change under `backend/data/seed/`, regenerate the frontend
bundle:

```bash
cd backend
npm run generate:static-data
```

CI's `static-data-sync` job fails if you forget. The Pages deploy
workflow regenerates automatically before building, so production never
serves stale seeds.

## Style

- Use **Codex tokens** (`bg-paper`, `text-ink`, `border-rule`, `bg-brand`,
  `text-mint`, etc.) — never raw `slate-*` / `blue-*` Tailwind classes.
  All design tokens live in `frontend/src/index.css` as CSS variables.
- Prefer editing existing files over creating new ones.
- No comments unless the *why* is non-obvious. Don't narrate what the
  code does — well-named identifiers do that.
- Match `.editorconfig`: 2-space indent, LF endings, final newline.

## Auth + progress flow

This repo runs in **two modes** at runtime per request:

1. **API mode** — when the backend is reachable, axios calls the Express
   server. Authenticated users get per-user progress via JWT.
2. **Static fallback** — when the request fails, the same frontend reads
   `frontend/public/seed/static-data.json` and writes progress to
   `localStorage`. This is what the GitHub Pages build uses.

When you add a new API endpoint, mirror the contract in
`frontend/src/api/api.js` (both the remote call and a `fallback*`
implementation). Otherwise the Pages build silently diverges from local
dev.

Server writes need `auth.requireAuth` + `writeLimiter`; reads use
`auth.optionalAuth` + `readLimiter`.

## Commit messages

Conventional-ish, but loose. Examples from history:

- `feat: add voice input button component`
- `fix: bump path-to-regexp via npm audit fix`
- `Major: upd`

Aim for the first style. Body in imperative mood.

## Things that need explicit approval

- Force-push to main.
- Modifying CI/CD or Render Blueprint config (`render.yaml`).
- Bumping `better-sqlite3` major (native bindings — affects all node_modules
  rebuilds).
- Anything that drops or rewrites the `progress` / `users` tables without a
  migration that runs idempotently on existing rows.
