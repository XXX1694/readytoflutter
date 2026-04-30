---
description: Run frontend Vitest suite and the backend smoke test
---

Run the project's automated tests.

1. Frontend: `npm --prefix frontend run test -- --run` (single-pass, not watch mode).
2. Backend smoke: `node -e "const db=require('./database');db.init();console.log('topics=',db.getTopics().length);db.close();"` from the `backend/` directory.

Report each as pass/fail with counts. If anything fails, show the failing test name and the assertion message — not the full stack.
