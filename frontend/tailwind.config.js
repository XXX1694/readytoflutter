/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  // `hover:` utilities compile to `@media (hover: hover)`. Without this a tap
  // on a phone leaves the hover tint stuck on the card or chip until the
  // next tap somewhere else.
  future: { hoverOnlyWhenSupported: true },
  theme: {
    extend: {
      colors: {
        // Atlas semantic tokens — driven by CSS vars in index.css.
        // Names preserved from previous Codex set so existing components inherit
        // the new look automatically. Only the *values* changed.
        paper: 'rgb(var(--paper) / <alpha-value>)',
        'paper-2': 'rgb(var(--paper-2) / <alpha-value>)',
        ink: 'rgb(var(--ink) / <alpha-value>)',
        'ink-2': 'rgb(var(--ink-2) / <alpha-value>)',
        'ink-3': 'rgb(var(--ink-3) / <alpha-value>)',
        rule: 'rgb(var(--rule) / <alpha-value>)',
        'rule-strong': 'rgb(var(--rule-strong) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        'muted-2': 'rgb(var(--muted-2) / <alpha-value>)',
        shadow: 'rgb(var(--shadow) / <alpha-value>)',

        // `brand` is the active stack's colour (see [data-stack] in index.css);
        // `on-brand` is the text that sits on a brand fill. The `stack.*` set
        // is every stack's own colour, for the places that show several
        // stacks side by side (the switcher, a mixed topic list).
        brand: {
          DEFAULT: 'rgb(var(--brand) / <alpha-value>)',
          ink: 'rgb(var(--brand-ink) / <alpha-value>)',
          sky: 'rgb(var(--brand-sky) / <alpha-value>)',
        },
        'on-brand': 'rgb(var(--on-brand) / <alpha-value>)',
        stack: {
          flutter: 'rgb(var(--stack-flutter) / <alpha-value>)',
          ios:     'rgb(var(--stack-ios) / <alpha-value>)',
          android: 'rgb(var(--stack-android) / <alpha-value>)',
          cross:   'rgb(var(--stack-cross) / <alpha-value>)',
          mobile:  'rgb(var(--stack-mobile) / <alpha-value>)',
          all:     'rgb(var(--stack-all) / <alpha-value>)',
        },
        mint: 'rgb(var(--mint) / <alpha-value>)',
        amber: 'rgb(var(--amber) / <alpha-value>)',
        coral: 'rgb(var(--coral) / <alpha-value>)',
        plum: 'rgb(var(--plum) / <alpha-value>)',
      },

      // Three roles, each with a job. `display` stays an alias of `sans` so
      // the existing font-display call sites keep working; the difference
      // between a heading and body text is size and weight, not family.
      fontFamily: {
        sans:    ['"Schibsted Grotesk Variable"', '"Schibsted Grotesk"', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        display: ['"Schibsted Grotesk Variable"', '"Schibsted Grotesk"', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        // Reading face — answers, cheatsheets, anything longer than a label.
        serif:   ['"Newsreader Variable"', 'Newsreader', 'Georgia', 'Cambria', 'serif'],
        mono:    ['"Spline Sans Mono Variable"', '"Spline Sans Mono"', 'ui-monospace', 'SFMono-Regular', 'Consolas', 'monospace'],
      },

      // Atlas opacity scale — Tailwind's default skips /8 and /12, but our
      // hairline borders + tinted surfaces lean on those values heavily
      // (e.g. `border-rule/12`, `bg-brand/12`, `from-rule/8`). Without this,
      // ~85 class usages silently no-op. Extending here keeps `<color>/<n>`
      // shorthand working everywhere.
      opacity: {
        2: '0.02',
        4: '0.04',
        6: '0.06',
        8: '0.08',
        12: '0.12',
        14: '0.14',
        18: '0.18',
        22: '0.22',
        35: '0.35',
        45: '0.45',
        55: '0.55',
        65: '0.65',
        85: '0.85',
      },

      borderRadius: {
        // Controls are 8–10px, sheets and cards 14–16px: rounded enough to
        // read as an app, not so round that a card becomes a bubble.
        DEFAULT: '8px',
        sm: '6px',
        md: '10px',
        lg: '12px',
        xl: '14px',
        '2xl': '16px',
        '3xl': '20px',
      },

      boxShadow: {
        // Elevation is a contact line plus a wide, low, warm drop. Never a
        // coloured glow.
        'codex-sm': '0 1px 2px 0 rgb(var(--shadow) / 0.05)',
        'codex':    '0 1px 2px 0 rgb(var(--shadow) / 0.05), 0 4px 12px -4px rgb(var(--shadow) / 0.08)',
        'codex-lg': '0 2px 4px -1px rgb(var(--shadow) / 0.06), 0 16px 40px -12px rgb(var(--shadow) / 0.18)',
        // Keyboard focus on a card: a ring in the stack colour.
        focus: '0 0 0 2px rgb(var(--brand) / 0.70)',
      },

      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in':  'fade-in 240ms cubic-bezier(0.22, 1, 0.36, 1)',
        'slide-up': 'slide-up 280ms cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
