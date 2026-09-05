/**
 * Lazy Shiki highlighter. Only initialized on first use, then memoized for the
 * lifetime of the page. Languages and themes are loaded dynamically so the
 * critical bundle stays small.
 *
 * Two things keep the study path cheap:
 *
 * 1. The JavaScript regex engine, not Oniguruma. Oniguruma ships its regex
 *    matcher as a base64-inlined WASM blob (~620 kB raw) that has to be in the
 *    bundle before a single token can be coloured. The JS engine transpiles the
 *    same Oniguruma patterns to native RegExp instead. Output was verified
 *    byte-identical to Oniguruma across all 392 seeded snippets in both themes.
 *
 * 2. One grammar per request, not all of them. Grammars are only registered on
 *    the core highlighter when a snippet actually asks for that language, so a
 *    Dart question fetches the Dart grammar and nothing else. This matters more
 *    than it looks: `ruby` alone drags in html, haml, xml, sql, graphql, css,
 *    c, cpp, javascript, shellscript, lua and yaml as embedded sub-grammars,
 *    and only five questions in the seed are Ruby.
 */

import { createHighlighterCore, type HighlighterCore } from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';

let corePromise: Promise<HighlighterCore> | null = null;
// The resolved core and the grammars already registered on it. `highlightNow`
// reads these to colour without an await — the live-coding editor re-highlights
// on every keystroke and cannot wait a microtask for the paint.
let readyCore: HighlighterCore | null = null;
const readyLangs = new Set<string>();

const LANG_LOADERS: Record<string, () => Promise<{ default: unknown }>> = {
  dart: () => import('@shikijs/langs/dart'),
  kotlin: () => import('@shikijs/langs/kotlin'),
  swift: () => import('@shikijs/langs/swift'),
  groovy: () => import('@shikijs/langs/groovy'),
  xml: () => import('@shikijs/langs/xml'),
  ruby: () => import('@shikijs/langs/ruby'),
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
// Both are registered up front: they're ~29 kB raw between them, and loading
// them together keeps the light/dark toggle from flashing an unstyled block.
const THEME_LOADERS: Array<() => Promise<{ default: unknown }>> = [
  () => import('@shikijs/themes/github-light'),
  () => import('@shikijs/themes/github-dark-default'),
];

async function getCore(): Promise<HighlighterCore> {
  if (!corePromise) {
    corePromise = (async () => {
      const themes = await Promise.all(THEME_LOADERS.map((l) => l()));
      // shiki/core types are loose around the dynamic-loaded grammar shape;
      // cast through unknown to satisfy TS without bringing the whole grammar
      // typings into our app surface.
      readyCore = await createHighlighterCore({
        themes: themes.map((m) => m.default) as never,
        langs: [],
        engine: createJavaScriptRegexEngine(),
      });
      return readyCore;
    })();
  }
  return corePromise;
}

/** In-flight/settled grammar registrations, keyed by canonical language. */
const langPromises = new Map<string, Promise<void>>();

async function loadLang(core: HighlighterCore, lang: string): Promise<void> {
  let pending = langPromises.get(lang);
  if (!pending) {
    pending = LANG_LOADERS[lang]()
      .then((m) => core.loadLanguage(m.default as never))
      .then(() => { readyLangs.add(lang); })
      .catch((err: unknown) => {
        // Don't cache the failure — a transient chunk fetch error shouldn't
        // permanently un-highlight this language for the rest of the session.
        langPromises.delete(lang);
        throw err;
      });
    langPromises.set(lang, pending);
  }
  return pending;
}

const langAlias = (lang: string | null | undefined): string => {
  if (!lang) return 'dart';
  const l = String(lang).toLowerCase();
  if (l === 'sh' || l === 'zsh') return 'bash';
  if (l === 'js') return 'javascript';
  if (l === 'ts') return 'typescript';
  if (l === 'yml') return 'yaml';
  if (l === 'kt' || l === 'kts') return 'kotlin';
  if (l === 'rb') return 'ruby';
  if (l === 'gradle') return 'groovy';
  if (l === 'html' || l === 'svg' || l === 'plist') return 'xml';
  if (LANG_LOADERS[l]) return l;
  return 'dart';
};

export async function highlightCode(
  code: string,
  language: string | null | undefined,
  isDark: boolean,
): Promise<string> {
  const hl = await getCore();
  const lang = langAlias(language);
  await loadLang(hl, lang);
  return hl.codeToHtml(code, {
    lang,
    theme: isDark ? 'github-dark-default' : 'github-light',
  });
}

/**
 * Load the core and one grammar, so `highlightNow` can answer synchronously
 * from then on. Resolves (and rejects) exactly like `highlightCode`.
 */
export async function prepareHighlighter(language: string | null | undefined): Promise<void> {
  const hl = await getCore();
  await loadLang(hl, langAlias(language));
}

/**
 * Highlight without awaiting, or return null if the grammar is not registered
 * yet. The caller renders plain text until `prepareHighlighter` has resolved —
 * a text editor that blanks for a microtask on every keystroke is unusable.
 */
export function highlightNow(
  code: string,
  language: string | null | undefined,
  isDark: boolean,
): string | null {
  const lang = langAlias(language);
  if (!readyCore || !readyLangs.has(lang)) return null;
  return readyCore.codeToHtml(code, {
    lang,
    theme: isDark ? 'github-dark-default' : 'github-light',
  });
}
