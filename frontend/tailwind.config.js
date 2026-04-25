/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Existing brand (kept for back-compat with current screens)
        flutter: {
          blue: '#0175C2',
          navy: '#02569B',
          sky: '#54C5F8',
          dark: '#0D1117',
        },

        // Codex semantic tokens — driven by CSS vars in index.css.
        // Use these in new components (bg-paper, text-ink, border-rule, etc.)
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
      fontFamily: {
        display: ['"Fraunces Variable"', 'Fraunces', 'Georgia', 'serif'],
        sans: ['"Inter Variable"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono Variable"', '"JetBrains Mono"', 'Consolas', 'monospace'],
      },
      fontSize: {
        // Extra display sizes for the dashboard's big numbers / headlines
        'display-xs': ['2rem', { lineHeight: '1.05', letterSpacing: '-0.02em' }],
        'display-sm': ['2.75rem', { lineHeight: '1.02', letterSpacing: '-0.025em' }],
        'display-md': ['3.75rem', { lineHeight: '1.0', letterSpacing: '-0.03em' }],
        'display-lg': ['5rem', { lineHeight: '0.95', letterSpacing: '-0.035em' }],
      },
      letterSpacing: {
        tightest: '-0.04em',
      },
      borderWidth: {
        1.5: '1.5px',
      },
      boxShadow: {
        // Hard-offset brutalist shadows — softened color (--shadow), lower alpha
        // so they read as definite-but-not-aggressive against warm paper.
        'codex-sm': '3px 3px 0 0 rgb(var(--shadow) / 0.7)',
        'codex': '4px 4px 0 0 rgb(var(--shadow) / 0.7)',
        'codex-lg': '6px 6px 0 0 rgb(var(--shadow) / 0.7)',
        'codex-brand': '4px 4px 0 0 rgb(var(--brand) / 0.85)',
        'codex-mint': '4px 4px 0 0 rgb(var(--mint) / 0.85)',
        // Soft layered shadow for floating panels
        soft: '0 1px 0 rgb(var(--rule) / 1), 0 8px 24px -12px rgb(var(--shadow) / 0.15)',
        'soft-lg': '0 1px 0 rgb(var(--rule) / 1), 0 24px 48px -16px rgb(var(--shadow) / 0.20)',
      },
      backgroundImage: {
        // Signature gradient
        'codex-gradient':
          'linear-gradient(135deg, rgb(var(--brand)) 0%, rgb(var(--brand-sky)) 55%, rgb(var(--mint)) 100%)',
        // Faint blueprint grid for page backgrounds
        'blueprint':
          'linear-gradient(rgb(var(--rule) / 0.5) 1px, transparent 1px), linear-gradient(90deg, rgb(var(--rule) / 0.5) 1px, transparent 1px)',
      },
      backgroundSize: {
        'blueprint-sm': '24px 24px',
        'blueprint': '32px 32px',
        'blueprint-lg': '48px 48px',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'fade-in': 'fade-in 200ms ease-out',
        'slide-up': 'slide-up 220ms cubic-bezier(0.22, 1, 0.36, 1)',
        shimmer: 'shimmer 1.6s linear infinite',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
