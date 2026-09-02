# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

## 5. Project Invariants

**These are specific to this repo. Breaking one produces a green local run and a
red CI, a broken anonymous mode, or a silent perf regression.**

**Seed content has one source.** Questions, topics and the roadmap are edited
only in `backend/data/seed/topics.json`, `backend/data/seed/questions/*.json`
and `backend/data/seed/roadmap.json`. After any change there, run
`npm --prefix backend run generate:static-data` — the committed
`frontend/public/seed/static-data.json` is generated, never hand-edited. The
generator refuses a roadmap with an empty rung, an unknown topic, or a question
counted twice in one track; `src/lib/roadmap.test.ts` additionally fails if a
track misses any question of its own stack. CI's `static-data-sync` job runs the same script with `--check`
and fails the PR on drift.

**Every API call goes through `tryRemote(remote, fallback)`.** See
`frontend/src/api/api.ts`. The frontend must stay fully usable with no backend
at all (that is the GitHub Pages deploy). A bare `api.get(...)` without a
localStorage/static-data fallback breaks anonymous mode, and nothing in CI
catches it.

**`tsconfig.json` is fully strict — keep it that way.** `strict`,
`noUnusedLocals` and `noUnusedParameters` are all on, and `npm run typecheck` is
a CI gate. The migration debt that once justified relaxing `noImplicitAny` and
`strictNullChecks` (~170 errors, mostly `({ ...props }: any)` in pages) is paid
off. Type new props with a real interface; never widen a signature to `any` or
reach for `as any` to silence the compiler.

**Keep `i18n/contentRu.ts` out of the eager graph.** It is ~630 KB of source.
`i18n/content.ts` loads it through a dynamic import for exactly this reason —
anything statically importing it from the `App → Layout → Sidebar` chain puts
the whole Russian corpus back into the entry chunk for every visitor. The entry
chunk should stay well under 100 KB gzip; `npm run build` prints it.

**Never rename a persistence key to match a rebrand.** `readytoflutter_progress_v1`
(`api/api.ts`, `lib/activity.ts`) holds anonymous users' progress and the
`rtf-*` Workbox cache names hold their offline data. They intentionally keep
pre-rename names; changing one silently destroys or orphans real user data and
needs an explicit migration, not a find-and-replace.

**Pages are built from `src/ui` and named from `lib/routes.ts`.** Every page
starts with `PageShell` + `PageHeader`; collections are `List`/`ListRow`;
filters are `Chip`s; destinations and their labels come from `lib/routes.ts`
and the `nav` block of `i18n/ui.ts` (see `frontend/DESIGN.md`, rules 8–16).
Page copy goes in `i18n/<page>.ts` (`{ en, ru }` + `useXCopy`), never in
`ui.ts` (eager chunk) and never as inline `lang === 'ru'` ternaries.
`npm --prefix frontend run smoke` is the visual safety net; CI runs it.

**Tests are `*.test.ts` next to the module they cover.** Vitest collects
`src/**/*.test.{ts,tsx,js,jsx}` (`vite.config.js`). Backend tests use the
built-in `node:test` runner — don't add a test framework dependency.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.