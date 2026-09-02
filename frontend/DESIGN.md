# Marginalia — the Onsite design system

The premise: **this is a book you study from, not a dashboard you monitor.**
The page is a printed book with one pen: black ink on paper, and a blue that
is reserved for things you can act on — links, level chips, the one figure
that asks for attention today. Everything else is carried by type and spacing.

A yellow highlighter used to be the accent (a wash behind the current nav
item, the wordmark, revealed answers). It was retired on 2026-09-02 at the
owner's request: laid behind text it read as a rendering glitch. Don't bring
it back.

Tokens live in `src/index.css`; Tailwind maps them in `tailwind.config.js`.
Always use the token classes (`text-ink`, `bg-paper-2`, `border-rule/12`).
Never hardcode a hex value in a component. Dark mode is page `#0E0E0D`,
sheet `#1B1B18`, hairlines at 14% — enough for a card to keep an edge.

## Type

| Role | Family | Use for |
|---|---|---|
| `font-sans` / `font-display` | Schibsted Grotesk | UI, navigation, headings, labels, buttons |
| `font-serif` | Newsreader | Answers, cheatsheet prose, anything read at length |
| `font-mono` | Spline Sans Mono | Code, keyboard shortcuts, timers, ID-like data |

Body copy is 15–17px. Answers use `.answer-text` (already serif, 68ch measure).
Headings get weight and size, not letterspacing. The scale is seven steps:
`display-sm` 44px (auth and landings only) · page title 28px · section 20px ·
answers 17px serif · body 15px · meta 13px · eyebrow 12px, plus 12px mono
for figures and keys. There are no larger display sizes.

## Colour

`--ink` `--ink-2` `--ink-3` `--muted` text · `--paper` page · `--paper-2` sheet ·
`--rule` hairlines (always through an alpha) · `--brand` petrol navy, the
pen, for links, interactive text and the one figure asking for action ·
`--mint` `--amber` `--coral` `--plum` semantic only (right / partial / wrong /
fourth category).

The current nav item is weight plus a tinted row (`bg-rule/8`). There is no
highlight wash anywhere, and no `.marker` class.

## Rules — these are what the redesign is for

1. **No emoji anywhere in the UI.** Not in copy, not in empty states, not as
   icons. Use `lucide-react` or a typographic mark. (Topic `icon` fields in the
   seed data are unused — `TopicGlyph` renders the lucide icon mapped per topic
   in `lib/topicIcons.ts`, one icon per *concept* so "networking" looks the
   same in every stack, with a monogram only as the fallback.)
2. **No uppercase micro-labels with wide tracking.** `uppercase` +
   `tracking-[0.18em]` + `font-mono` + `text-[10px]` is the house tell of a
   templated dashboard, and at 10px it is genuinely hard to read. Use sentence
   case in the grotesk at 12px (`.eyebrow`). Uppercase is allowed only for
   real abbreviations (SRS, KMP, CI).
3. **No gradients.** Not on text, not on backgrounds, not on icon tiles, not on
   buttons.
4. **No glow shadows.** Elevation is a hairline border plus at most a 2px drop.
5. **Motion must mean something.** Keep transitions that communicate state
   (a reveal, a page transition). No decorative float, pulse, shimmer or
   hover-lift. `index.css` collapses every transition under
   `prefers-reduced-motion`; framer honours the same setting via
   `<MotionConfig reducedMotion="user">`.
6. **Don't invent a second accent.** If something needs emphasis, it gets
   weight, the pen's blue, or space — not a new hue. Semantic colour is a dot
   or a 2px edge, never a filled chip and never a wash behind text.
7. **One idea per element.** A label labels. Don't stack an icon, a dot, a
   caps label and a count into a single row of chrome.

## Page rules — the second redesign (2026-09-02)

The first redesign fixed the components; the pages were still overloaded.
These rules apply at page level and are what `src/ui` exists to enforce.

8. **One job per screen, one primary action.** Today gets you into a session.
   Topics lets you pick one. A topic page has one solid button and a `⋯` menu.
   A second solid button on a screen is a bug.
9. **One number per fact.** Progress is completed questions over the total in
   the active stack — in the rail, on Progress, on the roadmap's standing
   card. Nothing is called mastery, recall or completion. A topic nobody has
   touched is "not started", never "weakest".
10. **One name per destination.** Today · Roadmap · Topics · Progress · Me;
    Session / Timed session / Follow-ups; Saved; Sources. The rail, the tab
    bar, page titles and the palette all read `lib/routes.ts` and the `nav`
    block of `i18n/ui.ts`. The routes themselves (`/stats`, `/study`,
    `/mock`, `/knowledge`, `/bookmarks`, `/settings`) do not change.
11. **Lists over cards.** The default for a collection is `List` + `ListRow`
    (56px rows, hairlines). A card (`.codex-card`) is reserved for the two or
    three objects on a screen you act on — the Today card, the roadmap's
    standing card, an open question. Never a card inside a card.
12. **Capped widths.** Every page starts with `PageShell`: `app` 1120px,
    `reading` 768px (sessions, a topic, Me), `catalog` 1400px (Topics),
    `narrow` 448px (auth, 404). No page declares its own padding.
13. **One header recipe.** `PageHeader` — eyebrow, 28px title, 15px subtitle,
    the hairline, one `actions` slot. `Section` for 20px in-page headings.
14. **Filters are `Chip`s in a `ChipGroup`.** 40px, pill, `aria-pressed`.
    Difficulty on a question row is 12px muted text, not a coloured chip.
15. **Copy lives in dictionaries.** Chrome strings in `i18n/ui.ts`; page
    strings in `i18n/<page>.ts` (`{ en, ru }` + `useXCopy(lang)`) so they ship
    with the page chunk. No `lang === 'ru' ? … : …` in new JSX.
16. **The stack is chosen once.** The header's stack menu is the only stack
    control in the chrome; pages scope to `usePrefs.platform` instead of
    repeating the choice. First run offers Flutter · iOS · Android inline on
    Today; there is no onboarding modal and no tour.

## Copy

Sentence case. Active voice. Say what happens: "Show answer", not "Reveal".
An action keeps its name through the flow — the button that says "Start round"
leads to a screen titled "Round". Errors say what broke and what to do. Empty
states invite an action rather than apologising. No exclamation marks.

## Quality floor

`npm run smoke` (scripts/smoke.cjs) loads every public route at 360px and
1280px, light and dark, EN and RU, in an anonymous session and fails on a page
error, a missing `<h1>`, the ErrorBoundary fallback or horizontal overflow;
CI runs it on every push. Responsive to 360px. Visible keyboard focus (the global `:focus-visible` ring
already does this — don't remove outlines). Touch targets ≥44px via
`.touch-target`. Text contrast ≥4.5:1; `--muted` and `--muted-2` both clear it.
