# CLAUDE.md

How to work in this repo. Sections 1–4 are how to approach a change; section 5
is what breaks if you get it wrong.

## 1. Scope is the deliverable

The request — or the plan you agreed to — sets the scope. Don't quietly narrow,
widen or swap it. Read ambiguity the way a careful colleague would: make the
routine judgment calls yourself and state the assumption in your summary. Ask
only when two readings would lead to materially different work, and only after
doing everything that doesn't depend on the answer. If you see a real problem
with the task as specified, say so in a sentence or two and keep building under
a stated assumption; if the ask is repeated, that's the decision — build it.

When you have enough information to act, act. A step you've decided on is
something to run, not to announce. If a simpler approach exists, say so.

## 2. Simplicity first

The minimum code that solves the problem, nothing speculative. No features
beyond what was asked, no abstraction for a single call site, no configurability
nobody requested, no error handling for scenarios that cannot happen — trust
internal code and framework guarantees, and validate at the boundaries (user
input, the backend). Don't leave the opposite failure either: half-finished
work, a compatibility shim, a flag where changing the code would do. The
simplest thing that works, finished.

## 3. Surgical changes

Touch only what the request needs. Don't "improve" adjacent code, comments or
formatting. Don't refactor things that aren't broken. Match the surrounding
style even where you'd write it differently. A pre-existing bug, a performance
concern or dead code you notice on the way is a follow-up for your summary, not
a change to make now — unless the requested behaviour cannot work without it.

Edit files surgically rather than rewriting them; a whole-file rewrite for a
small change buries the diff and costs output tokens for nothing. Remove the
imports, variables and helpers that *your* change orphaned, and leave
pre-existing dead code alone.

Every changed line should trace to the request.

## 4. Verify, then report what you actually saw

Turn the task into something checkable before you start: "add validation" is
"tests for the invalid inputs, and they pass"; "fix the bug" is "a test that
reproduces it, and it passes"; "refactor X" is "the same tests pass before and
after". The gates are `npm --prefix frontend run typecheck`, `test`, `lint` and
`smoke`, plus `npm --prefix backend test`; CI runs all of them.

Check every progress claim against a tool result from this session before you
report it. If tests fail, say so with the output; if you skipped a step, say
that; when something is done and verified, say so plainly without hedging.

Verify however you like — scratch scripts don't need to be kept. Commit tests
only where the task asks for them, or where this repo already keeps tests for
that kind of change, sized like the neighbouring test files.

## 5. Project Invariants

**These are specific to this repo. Breaking one produces a green local run and a
red CI, a broken anonymous mode, or a silent perf regression.**

**Seed content has one source.** Questions, topics and the roadmap are edited
only in `backend/data/seed/topics.json`, `backend/data/seed/questions/*.json`
and `backend/data/seed/roadmap.json`. After any change there, run
`npm --prefix backend run generate:static-data` — the committed
`frontend/public/seed/static-data.json` (the catalogue: topics, roadmap and
every question *without* its answer) and `frontend/public/seed/answers/<slug>.json`
(one topic's answers and code examples) are generated, never hand-edited.
The split is deliberate: answers are ~90% of the bytes and nothing on the
first screen reads them, so `useQuestions()` returns `QuestionSummary` and a
screen that shows an answer goes through `useAnswer(question)`. The
generator refuses a roadmap with an empty rung, an unknown topic, or a question
counted twice in one track; `src/lib/roadmap.test.ts` additionally fails if a
track misses any question of its own stack. **Answers are Markdown** (CommonMark
+ GFM; `-` bullets, `### Heading`, `**term**`, `` `code` ``, fences) in both
the seed and `frontend/src/i18n/contentRu.ts`; `AnswerText` renders them and
`lib/markdown.ts` `toPlainText` is what speech, hints and search read. The
backend upserts topics and questions from the seed on boot whenever the seed
changes (`syncSeedContent`, keyed by a content hash), so a deployed database
never serves stale wording. CI's `static-data-sync` job runs the same script with `--check`
and fails the PR on drift.

**Every API call goes through `tryRemote(remote, fallback)`.** See
`frontend/src/api/api.ts`. The frontend must stay fully usable with no backend
at all (that is the GitHub Pages deploy). CI's `repo-invariants` job greps for
`api.get(…)`/`fetch(…)` outside `api/api.ts`, but nothing checks that a call
*inside* it has a fallback — a remote call with no localStorage/static-data
fallback breaks anonymous mode silently.

**`tsconfig.json` is fully strict — keep it that way.** `strict`,
`noUnusedLocals` and `noUnusedParameters` are all on, and `npm run typecheck` is
a CI gate. Type new props with a real interface; never widen a signature to
`any` or reach for `as any` to silence the compiler.

**Keep `i18n/contentRu.ts` out of the eager graph.** It is ~1.5 MB of source.
`i18n/content.ts` loads it through a dynamic import for exactly this reason —
anything statically importing it from the `App → Layout → Sidebar` chain puts
the whole Russian corpus back into the entry chunk for every visitor. The entry
chunk stays well under 100 KB gzip; CI guards both ends — `repo-invariants`
rejects a static `from './contentRu'`, and `bundle-size` fails past 95 KB gzip
for the entry chunk and 240 KB gzip for first-paint JS.

**Never rename a persistence key to match a rebrand.** `readytoflutter_progress_v1`
(`api/api.ts`, `lib/activity.ts`) holds anonymous users' progress; `rtf:srs:v1`,
`rtf:bookmarks:v1` and `rtf:prefs:v1` hold their scheduling, bookmarks and
preferences; the `rtf-*` Workbox cache names hold their offline data. They
intentionally keep pre-rename names; changing one silently destroys or orphans
real user data and needs an explicit migration, not a find-and-replace. CI's
`repo-invariants` job greps for each key by name.

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
