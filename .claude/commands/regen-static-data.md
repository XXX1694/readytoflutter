---
description: Regenerate frontend/public/seed/static-data.json from backend seed JSON
---

Run `npm --prefix backend run generate:static-data`.

This is required after editing any file under `backend/data/seed/`. CI's `static-data-sync` job fails the build if this is out of sync, so run it before pushing seed changes.

After it completes, run `git status` and report which files changed. Do NOT commit — let the user decide.
