/**
 * Lazy Shiki highlighter. Only initialized on first use, then memoized for the
 * lifetime of the page. Languages and themes are loaded dynamically so the
 * critical bundle stays small.
 */

import { createHighlighterCore, type HighlighterCore } from 'shiki/core';
import { createOnigurumaEngine } from 'shiki/engine/oniguruma';

let highlighterPromise: Promise<HighlighterCore> | null = null;

const LANG_LOADERS: Record<string, () => Promise<{ default: unknown }>> = {
  dart: () => import('@shikijs/langs/dart'),
  json: () => import('@shikijs/langs/json'),
  yaml: () => import('@shikijs/langs/yaml'),
  bash: () => import('@shikijs/langs/bash'),
  shell: () => import('@shikijs/langs/shellscript'),
  javascript: () => import('@shikijs/langs/javascript'),
  typescript: () => import('@shikijs/langs/typescript'),
};

// Themes use static imports because Vite's dynamic-import-vars can't analyze
// template-literal paths into the @shikijs/themes package (silent failure →
// the highlighter promise rejects and CodeBlock falls back to unstyled <pre>).
const THEME_LOADERS: Array<() => Promise<{ default: unknown }>> = [
  () => import('@shikijs/themes/github-light'),
  () => import('@shikijs/themes/github-dark-default'),
];

async function getHighlighter(): Promise<HighlighterCore> {
  if (!highlighterPromise) {
    highlighterPromise = (async () => {
      const langs = await Promise.all(Object.values(LANG_LOADERS).map((l) => l()));
      const themes = await Promise.all(THEME_LOADERS.map((l) => l()));
      // shiki/core types are loose around the dynamic-loaded grammar shape;
      // cast through unknown to satisfy TS without bringing the whole grammar
      // typings into our app surface.
      return createHighlighterCore({
        themes: themes.map((m) => m.default) as never,
        langs: langs.map((m) => m.default) as never,
        engine: createOnigurumaEngine(() => import('shiki/wasm')),
      });
    })();
  }
  return highlighterPromise;
}

const langAlias = (lang: string | null | undefined): string => {
  if (!lang) return 'dart';
  const l = String(lang).toLowerCase();
  if (l === 'sh' || l === 'zsh') return 'bash';
  if (l === 'js') return 'javascript';
  if (l === 'ts') return 'typescript';
  if (l === 'yml') return 'yaml';
  if (LANG_LOADERS[l]) return l;
  return 'dart';
};

export async function highlightCode(
  code: string,
  language: string | null | undefined,
  isDark: boolean,
): Promise<string> {
  const hl = await getHighlighter();
  return hl.codeToHtml(code, {
    lang: langAlias(language),
    theme: isDark ? 'github-dark-default' : 'github-light',
  });
}
