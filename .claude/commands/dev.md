---
description: Start frontend Vite dev server on :3000 in the background and report the URL
---

Start the frontend dev server.

1. Check if port 3000 is already in use with `lsof -i :3000`. If yes, report what's running and stop — don't start a duplicate.
2. Otherwise run `npm --prefix frontend run dev` in the background via Bash with `run_in_background: true`.
3. Wait briefly, then read the background output to confirm Vite booted (look for "Local:" line).
4. Report the URL (`http://localhost:3000`) and the background shell id so the user can tail or stop it.

Do not start the backend unless the user explicitly asks — the frontend's static-fallback mode works without it.
