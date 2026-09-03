# Marginalia — the Onsite design system

The premise: **this is a book you study from, not a dashboard you monitor —
bound in the colour of the stack you are preparing for.** The page is ink on
paper; the one accent, `--brand`, is not a fixed hue but the active stack's
own colour. Everything else is carried by type and spacing, and the surfaces
you *read* (answers, questions, cheatsheets) stay ink on paper no matter
which stack is on.

## The stack colour system (2026-09-03)

The third redesign. The owner's brief: the monochrome build was "boring", the
stack switch was invisible, and the text must stay readable. The answer is
one idea spent in one place: **the app wears your stack.**

| Stack | Token | Light | Dark | Mark |
|---|---|---|---|---|
| Flutter | `--stack-flutter` | `#0A5FC2` | `#5FB8F5` | Flutter wing |
| iOS | `--stack-ios` | `#C63C15` | `#FF8A65` | Apple |
| Android | `--stack-android` | `#127A46` | `#3DDC84` | Android head |
| Cross-platform (KMP) | `--stack-cross` | `#6B3FE0` | `#B39DFF` | Kotlin K |
| Mobile (shared topics) | `--stack-mobile` | `#0F7A85` | `#4DD0DB` | lucide `Smartphone` |
| Every stack | `--stack-all` | `#1B4F8A` | `#7EA9DC` | lucide `Layers` |

- `store/prefs.ts` mirrors `platform` to `<html data-stack="…">`; `index.css`
  re-points `--brand` from it. **Nothing else in the app knows which stack is
  on** — use `text-brand` / `bg-brand` / `text-on-brand` and it follows.
- Every light value clears 4.5:1 as text on the white sheet, so a stack
  colour can be a link, a figure or a filled button without a "safe" variant.
  In dark the values are bright and `--on-brand` is ink, so a fill takes
  dark text.
- `lib/stackIcons.tsx` holds the marks (`StackIcon`), the coloured tile
  (`StackTile`, solid = identity, soft = tinted) and `STACK_TEXT`. The brand
  paths are Simple Icons (CC0).
- `components/StackSwitcher.tsx` is the one stack control: `StackRows` in the
  desktop rail (always visible — a choice that recolours the app should not
  hide in a menu), in the phone header's `StackPill` → `StackSheet`, in Me,
  and as the first-run `StackPicker` cards. Chips that scope a page to a
  stack (roadmap track, timed session) carry the stack's mark via
  `Chip icon=`.
- `TopicGlyph` tints a topic's tile in its stack's colour, so a mixed list
  reads by colour before it is read by name.
- **The Today card is the one painted surface**: `bg-brand text-on-brand`,
  the stack's mark as a watermark, an `inverse` button. Nothing else on the
  site is a brand-filled panel. Do not paint a second one.

Tokens live in `src/index.css`; Tailwind maps them in `tailwind.config.js`.
Always use the token classes (`text-ink`, `bg-paper-2`, `border-rule/12`).
Never hardcode a hex value in a component. Light is page `#F6F6F3`, sheet
white; dark is page `#0E0E0D`, sheet `#1B1B18`, hairlines at 14%.

A yellow highlighter used to be the accent (a wash behind the current nav
item, the wordmark, revealed answers). It was retired on 2026-09-02: laid
behind text it read as a rendering glitch. Don't bring it back.

## Type

| Role | Family | Use for |
|---|---|---|
| `font-sans` / `font-display` | Schibsted Grotesk | UI, navigation, headings, labels, buttons |
| `font-serif` | Newsreader | Answers, cheatsheet prose, anything read at length |
| `font-mono` | Spline Sans Mono | Code, keyboard shortcuts, timers, ID-like data |

Body copy is 15–17px. Answers use `.answer-text` (already serif, 68ch measure).
Headings get weight and size, not letterspacing. The scale:
Today's figure 52px · `display-sm` 44px (auth and landings) · page title
32px bold · section 20px · answers 17px serif · body 15px · meta 13px ·
eyebrow 12px, plus 12px mono for figures and keys.

## Colour

`--ink` `--ink-2` `--ink-3` `--muted` text · `--paper` page · `--paper-2` sheet ·
`--rule` hairlines (always through an alpha) · `--brand` the active stack's
colour (see above) for links, filled buttons, the active nav row, progress,
focus and selection · `--on-brand` text on a brand fill · `--stack-*` every
stack's own colour, for the places that show several side by side ·
`--mint` `--amber` `--coral` `--plum` semantic only (right / partial / wrong /
fourth category).

The current nav item is a tinted row in the stack colour (`bg-brand/10
text-brand`). There is no highlight wash behind running text anywhere.

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
   buttons. Colour is flat: a stack colour is a fill or a tint, never a ramp.
4. **No glow shadows.** Elevation is a hairline plus a soft, low, *warm* drop
   (`shadow-codex`, `shadow-codex-lg`) — never a coloured glow.
5. **Motion must mean something.** Keep transitions that communicate state
   (a reveal, a page transition). No decorative float, pulse, shimmer or
   hover-lift. `index.css` collapses every transition under
   `prefers-reduced-motion`; framer honours the same setting via
   `<MotionConfig reducedMotion="user">`.
6. **Don't invent a second accent.** If something needs emphasis, it gets
   weight, `--brand`, or space — not a new hue. The `--stack-*` colours are
   not accents; they only appear where several stacks are shown together
   (the switcher, a mixed topic list). Semantic colour is a dot or a 2px
   edge, never a wash behind running text.
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
16. **The stack is chosen once, and always visible.** `StackRows` in the rail
    (desktop) and the `StackPill` in the phone header are the stack control
    in the chrome; pages scope to `usePrefs.platform` instead of repeating
    the choice. First run offers Flutter · iOS · Android as cards on Today;
    there is no onboarding modal and no tour.

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
