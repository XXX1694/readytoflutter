/**
 * Lazy Shiki highlighter. Only initialized on first use, then memoized for the
 * lifetime of the page. Languages and themes are loaded dynamically so the
 * critical bundle stays small.
 */

import { createHighlighterCore } from 'shiki/core';
import { createOnigurumaEngine } from 'shiki/engine/oniguruma';

let highlighterPromise = null;

const LANG_LOADERS = {
  dart: () => import('@shikijs/langs/dart'),
  json: () => import('@shikijs/langs/json'),
  yaml: () => import('@shikijs/langs/yaml'),
  bash: () => import('@shikijs/langs/bash'),
  shell: () => import('@shikijs/langs/shellscript'),
  javascript: () => import('@shikijs/langs/javascript'),
  typescript: () => import('@shikijs/langs/typescript'),
};

const THEMES = ['github-light', 'github-dark-default'];

async function getHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = (async () => {
      const langs = await Promise.all(Object.values(LANG_LOADERS).map((l) => l()));
      const themes = await Promise.all(
        THEMES.map((t) => import(`@shikijs/themes/${t}`)),
      );
      return createHighlighterCore({
        themes: themes.map((m) => m.default),
        langs: langs.map((m) => m.default),
        engine: createOnigurumaEngine(() => import('shiki/wasm')),
      });
    })();
  }
  return highlighterPromise;
}

const langAlias = (lang) => {
  if (!lang) return 'dart';
  const l = String(lang).toLowerCase();
  if (l === 'sh' || l === 'zsh') return 'bash';
  if (l === 'js') return 'javascript';
  if (l === 'ts') return 'typescript';
  if (l === 'yml') return 'yaml';
  if (LANG_LOADERS[l]) return l;
  return 'dart';
};

export async function highlightCode(code, language, isDark) {
  const hl = await getHighlighter();
  return hl.codeToHtml(code, {
    lang: langAlias(language),
    theme: isDark ? 'github-dark-default' : 'github-light',
  });
}
