# Marginalia — the Onsite design system

The premise: **this is a book you study from, not a dashboard you monitor.**
The page is an annotated book: black ink, a yellow highlighter, a blue pen.
The marker is the accent and only ever appears as a wash *behind* ink, the way
a real highlighter works; the blue is reserved for things you can act on —
links and level chips. Everything else is carried by type and spacing.

Tokens live in `src/index.css`; Tailwind maps them in `tailwind.config.js`.
Always use the token classes (`text-ink`, `bg-paper-2`, `border-rule/12`).
Never hardcode a hex value in a component.

## Type

| Role | Family | Use for |
|---|---|---|
| `font-sans` / `font-display` | Schibsted Grotesk | UI, navigation, headings, labels, buttons |
| `font-serif` | Newsreader | Answers, cheatsheet prose, anything read at length |
| `font-mono` | Spline Sans Mono | Code, keyboard shortcuts, timers, ID-like data |

Body copy is 15–17px. Answers use `.answer-text` (already serif, 68ch measure).
Headings get weight and size, not letterspacing.

## Colour

`--ink` `--ink-2` `--ink-3` `--muted` text · `--paper` page · `--paper-2` sheet ·
`--rule` hairlines (always through an alpha) · `--brand` petrol navy, the
the pen, for links and interactive text · `--marker` highlighter yellow, the
accent · `--mint` `--amber`
`--coral` `--plum` semantic only (right / partial / wrong / fourth category).

The marker is applied with the `.marker` class on an inline element. It is
never a text colour and never fills a large area.

## Rules — these are what the redesign is for

1. **No emoji anywhere in the UI.** Not in copy, not in empty states, not as
   icons. Use `lucide-react` or a typographic mark. (Topic `icon` fields in the
   seed data are already unused — `TopicGlyph` renders monograms.)
2. **No uppercase micro-labels with wide tracking.** `uppercase` +
   `tracking-[0.18em]` + `font-mono` + `text-[10px]` is the house tell of a
   templated dashboard, and at 10px it is genuinely hard to read. Use sentence
   case in the grotesk at 12px (`.eyebrow`). Uppercase is allowed only for
   real abbreviations (SRS, KMP, CI).
3. **No gradients.** Not on text, not on backgrounds, not on icon tiles, not on
   buttons. `.text-gradient` and the `aurora` utilities have been redefined to
   flat values — remove the call sites when you touch a file.
4. **No glow shadows.** Elevation is a hairline border plus at most a 2px drop.
5. **Motion must mean something.** Keep transitions that communicate state
   (a reveal, a page transition). Delete decorative float, pulse, shimmer and
   hover-lift. Respect `prefers-reduced-motion`.
6. **Don't invent a third accent.** If something needs emphasis, it gets the
   marker, weight, or space — not a new hue.
7. **One idea per element.** A label labels. Don't stack an icon, a dot, a
   caps label and a count into a single row of chrome.

## Copy

Sentence case. Active voice. Say what happens: "Show answer", not "Reveal".
An action keeps its name through the flow — the button that says "Start round"
leads to a screen titled "Round". Errors say what broke and what to do. Empty
states invite an action rather than apologising. No exclamation marks.

## Quality floor

Responsive to 360px. Visible keyboard focus (the global `:focus-visible` ring
already does this — don't remove outlines). Touch targets ≥44px via
`.touch-target`. Text contrast ≥4.5:1; `--muted` and `--muted-2` both clear it.
