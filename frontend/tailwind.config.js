/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        flutter: {
          blue: '#027DFD',
          navy: '#042B59',
          sky: '#54C5F8',
          dark: '#0D1117',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
