/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Legacy Flutter brand still referenced by a few badges
        flutter: {
          blue: '#0175C2',
          navy: '#02569B',
          sky: '#54C5F8',
          dark: '#0D1117',
        },

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

      // Single sans family for everything. `display` kept as alias so old
      // `font-display` classes still work — they render as Inter now.
      fontFamily: {
        sans:    ['"Inter Variable"', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        display: ['"Inter Variable"', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        mono:    ['"JetBrains Mono Variable"', '"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Consolas', 'monospace'],
      },

      fontSize: {
        // Display sizes for hero / dashboard. Tighter tracking, heavier weight
        // since Inter feels lighter than Fraunces at the same size.
        'display-xs': ['2rem',    { lineHeight: '1.05', letterSpacing: '-0.025em', fontWeight: '600' }],
        'display-sm': ['2.75rem', { lineHeight: '1.02', letterSpacing: '-0.030em', fontWeight: '600' }],
        'display-md': ['3.75rem', { lineHeight: '1.0',  letterSpacing: '-0.035em', fontWeight: '600' }],
        'display-lg': ['5rem',    { lineHeight: '0.96', letterSpacing: '-0.040em', fontWeight: '600' }],
        'display-xl': ['6.5rem',  { lineHeight: '0.95', letterSpacing: '-0.045em', fontWeight: '600' }],
      },

      letterSpacing: {
        tightest: '-0.045em',
      },

      borderWidth: {
        // 1.5px referenced by many components. Keep available, but new design
        // uses 1px hairlines via `border` everywhere.
        1.5: '1.5px',
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
        // Modern bigger defaults — Linear / Vercel
        DEFAULT: '8px',
        sm: '6px',
        md: '10px',
        lg: '14px',
        xl: '18px',
        '2xl': '22px',
        '3xl': '28px',
      },

      boxShadow: {
        // Atlas soft elevation. Replaces brutalist hard offsets — same names so
        // existing components automatically pick up the new look.
        'codex-sm':
          '0 1px 2px 0 rgb(var(--shadow) / 0.04), 0 2px 6px -2px rgb(var(--shadow) / 0.06)',
        'codex':
          '0 1px 2px 0 rgb(var(--shadow) / 0.06), 0 8px 24px -8px rgb(var(--shadow) / 0.10)',
        'codex-lg':
          '0 2px 4px 0 rgb(var(--shadow) / 0.08), 0 24px 48px -16px rgb(var(--shadow) / 0.16)',
        'codex-brand':
          '0 0 0 1px rgb(var(--brand) / 0.40), 0 8px 24px -8px rgb(var(--brand) / 0.32)',
        'codex-mint':
          '0 0 0 1px rgb(var(--mint) / 0.40), 0 8px 24px -8px rgb(var(--mint) / 0.32)',
        soft:
          '0 1px 2px 0 rgb(var(--shadow) / 0.04), 0 4px 16px -4px rgb(var(--shadow) / 0.06)',
        'soft-lg':
          '0 2px 4px 0 rgb(var(--shadow) / 0.08), 0 24px 48px -16px rgb(var(--shadow) / 0.14)',
        aurora:
          '0 0 0 1px rgb(var(--brand) / 0.20), 0 12px 40px -8px rgb(var(--brand) / 0.30)',
      },

      backgroundImage: {
        'codex-gradient':
          'linear-gradient(135deg, rgb(var(--brand)) 0%, rgb(var(--brand-sky)) 50%, rgb(var(--mint)) 100%)',
        'aurora':
          'linear-gradient(135deg, rgb(var(--brand)) 0%, rgb(var(--brand-sky)) 50%, rgb(var(--mint)) 100%)',
        'aurora-soft':
          'linear-gradient(135deg, rgb(var(--brand) / 0.15) 0%, rgb(var(--brand-sky) / 0.12) 50%, rgb(var(--mint) / 0.10) 100%)',
        'ink-fade':
          'linear-gradient(180deg, rgb(var(--ink)) 0%, rgb(var(--ink) / 0.7) 100%)',
        'dotted':
          'radial-gradient(rgb(var(--rule) / 0.12) 1px, transparent 1px)',
      },
      backgroundSize: {
        'dotted': '24px 24px',
        'blueprint-sm': '24px 24px',
        'blueprint': '32px 32px',
        'blueprint-lg': '48px 48px',
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
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'aurora-shift': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%':      { backgroundPosition: '100% 50%' },
        },
      },
      animation: {
        'fade-in':  'fade-in 240ms cubic-bezier(0.22, 1, 0.36, 1)',
        'slide-up': 'slide-up 280ms cubic-bezier(0.22, 1, 0.36, 1)',
        shimmer:    'shimmer 1.6s linear infinite',
        'aurora':   'aurora-shift 14s ease-in-out infinite',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
