import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

// Pragmatic flat config — catch real bugs (hook deps, hook order, missing
// keys), don't enforce stylistic taste (Prettier handles that).
export default [
  { ignores: ['dist', 'node_modules', 'public', 'dev-dist'] },
  js.configs.recommended,
  {
    files: ['src/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.es2024 },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    settings: { react: { version: '18' } },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      // We use the new JSX transform — no React-in-scope requirement.
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      // Allow unused args prefixed with _ (matches our pattern in callbacks).
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // react-hooks v7 adds several "react-compiler"-style rules that flag
      // legit existing patterns (sync derived state, impure expressions during
      // render). Keep as warnings so they're visible but don't block CI.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-hooks/refs': 'warn',
      'react/no-unescaped-entities': 'off',
      // Allow empty catch blocks when paired with /* noop */ — we use this
      // for fire-and-forget toast loads, optional storage writes, etc.
      'no-empty': ['warn', { allowEmptyCatch: true }],
    },
  },
  {
    files: ['*.config.js', 'vite.config.js', 'tailwind.config.js', 'postcss.config.js'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
];
