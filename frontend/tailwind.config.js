/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
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

        brand: {
          DEFAULT: 'rgb(var(--brand) / <alpha-value>)',
          ink: 'rgb(var(--brand-ink) / <alpha-value>)',
          sky: 'rgb(var(--brand-sky) / <alpha-value>)',
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

      fontSize: {
        // Display scale. Schibsted has a tall x-height and open counters, so
        // it needs far less negative tracking than Inter did — the previous
        // -0.045em at 6.5rem collided the letterforms into a logo.
        'display-xs': ['2rem',    { lineHeight: '1.08', letterSpacing: '-0.014em', fontWeight: '600' }],
        'display-sm': ['2.75rem', { lineHeight: '1.05', letterSpacing: '-0.017em', fontWeight: '600' }],
        'display-md': ['3.75rem', { lineHeight: '1.02', letterSpacing: '-0.020em', fontWeight: '600' }],
        'display-lg': ['5rem',    { lineHeight: '0.98', letterSpacing: '-0.023em', fontWeight: '600' }],
        'display-xl': ['6.5rem',  { lineHeight: '0.96', letterSpacing: '-0.026em', fontWeight: '600' }],
      },

      letterSpacing: {
        tightest: '-0.026em',
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
        // Pulled in across the board. Large radii read as "app chrome"; this
        // is meant to read as paper, where a corner is a cut, not a bubble.
        DEFAULT: '6px',
        sm: '4px',
        md: '8px',
        lg: '10px',
        xl: '12px',
        '2xl': '14px',
        '3xl': '18px',
      },

      boxShadow: {
        // Paper doesn't glow. Elevation is a hairline plus, at most, a short
        // warm drop — enough to lift a sheet off the page and no more.
        'codex-sm': '0 1px 2px 0 rgb(var(--shadow) / 0.04)',
        'codex':    '0 1px 3px 0 rgb(var(--shadow) / 0.06)',
        'codex-lg': '0 2px 8px -2px rgb(var(--shadow) / 0.10)',
        // Keyboard focus on a card: the same ink+citron ring the global
        // :focus-visible rule paints, available as a utility.
        marker: '0 0 0 1px rgb(var(--ink) / 0.50), 0 0 0 4px rgb(var(--marker) / 0.45)',
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
