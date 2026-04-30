---
description: Production-build the frontend and report bundle stats
---

Build the frontend and surface anything noteworthy.

1. Run `npm --prefix frontend run build`.
2. If it fails, report the first error (file + line) and stop.
3. If it succeeds, parse the Vite output and report:
   - Top 5 chunks by size (gzip + raw).
   - Total `dist/` size from `du -sh frontend/dist`.
   - Any chunk > 500 KB raw — flag it as a code-splitting candidate.
4. Do NOT run `preview` unless asked.
