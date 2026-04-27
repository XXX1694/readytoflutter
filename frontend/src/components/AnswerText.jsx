import { lazy, Suspense, useMemo } from 'react';
import { cn } from '../lib/cn.js';

// CodeBlock is heavy (Shiki). Keep it lazy so prose-only answers don't pay.
const CodeBlock = lazy(() => import('./CodeBlock.jsx'));

const FENCE_RE = /```([a-zA-Z0-9_+-]*)\r?\n?([\s\S]*?)```/g;

// Languages we'd rather not feed to Shiki (ASCII trees, plain output, etc.).
const PROSE_LANGS = new Set(['', 'text', 'txt', 'plain', 'plaintext', 'tree', 'output']);

// Heuristic: a fence with no language but Dart-shaped tokens → treat as dart.
function looksLikeDart(src) {
  return /\b(class|void|final|var|Widget|build|return|extends|implements|@override)\b/.test(src);
}

function parseSegments(text) {
  if (!text) return [];
  const out = [];
  let last = 0;
  FENCE_RE.lastIndex = 0;
  let m;
  while ((m = FENCE_RE.exec(text)) !== null) {
    if (m.index > last) {
      out.push({ kind: 'prose', value: text.slice(last, m.index) });
    }
    const rawLang = (m[1] || '').toLowerCase();
    const code = (m[2] || '').replace(/\r\n/g, '\n').replace(/\n+$/, '');
    let lang = rawLang;
    if (!lang || PROSE_LANGS.has(lang)) {
      lang = looksLikeDart(code) ? 'dart' : (rawLang || 'text');
    }
    out.push({ kind: lang === 'text' ? 'pre' : 'code', value: code, lang });
    last = FENCE_RE.lastIndex;
  }
  if (last < text.length) {
    out.push({ kind: 'prose', value: text.slice(last) });
  }
  return out;
}

/**
 * Renders an answer string. Inline ```fences``` are routed through the
 * existing CodeBlock (Shiki highlighting + copy + DartPad), prose stays as
 * `whitespace-pre-wrap` text so existing line breaks survive.
 */
export default function AnswerText({ text, className, codeClassName }) {
  const segments = useMemo(() => parseSegments(text || ''), [text]);

  if (segments.length === 0) {
    return null;
  }

  // Pure prose? Render the same single div as before — no extra DOM.
  if (segments.length === 1 && segments[0].kind === 'prose') {
    return (
      <div className={cn('whitespace-pre-wrap', className)}>
        {segments[0].value}
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {segments.map((seg, i) => {
        if (seg.kind === 'prose') {
          // Trim only the leading/trailing newline that hugged a fence so the
          // gap collapses to the `space-y-3` rhythm.
          const trimmed = seg.value.replace(/^\n+/, '').replace(/\n+$/, '');
          if (!trimmed) return null;
          return (
            <div key={i} className="whitespace-pre-wrap">
              {trimmed}
            </div>
          );
        }
        if (seg.kind === 'pre') {
          return (
            <pre
              key={i}
              className="overflow-x-auto rounded-md border border-rule/15 bg-paper-2 p-3 font-mono text-[12.5px] leading-relaxed shadow-codex-sm"
            >
              {seg.value}
            </pre>
          );
        }
        return (
          <Suspense
            key={i}
            fallback={
              <pre className="overflow-x-auto rounded-md border border-rule/15 bg-paper-2 p-3 font-mono text-[12.5px] leading-relaxed">
                {seg.value}
              </pre>
            }
          >
            <CodeBlock code={seg.value} language={seg.lang} className={codeClassName} />
          </Suspense>
        );
      })}
    </div>
  );
}
