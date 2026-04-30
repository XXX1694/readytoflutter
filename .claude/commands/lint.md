---
description: Run ESLint on the frontend and report only real issues
---

Run `npm --prefix frontend run lint` and report results.

- If there are 0 errors and 0 new warnings vs. baseline, say "lint clean" and stop.
- If there are errors, list them grouped by file with line numbers (`path:line`).
- Pre-existing `react-hooks/*` warnings are tracked tech debt per CLAUDE.md — do not flag them unless the user asks.
- Do NOT auto-fix unless the user explicitly says so.
