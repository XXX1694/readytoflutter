import { useMemo } from 'react';
import { cn } from '../lib/cn';
import CodeBlock from './CodeBlock';

const FENCE_RE = /```([a-zA-Z0-9_+-]*)\r?\n?([\s\S]*?)```/g;

// Languages we'd rather not feed to Shiki (ASCII trees, plain output, etc.).
const PROSE_LANGS = new Set(['', 'text', 'txt', 'plain', 'plaintext', 'tree', 'output']);

type Segment =
  | { kind: 'prose'; value: string }
  | { kind: 'pre'; value: string; lang: string }
  | { kind: 'code'; value: string; lang: string };

// Heuristic: a fence with no language but Dart-shaped tokens → treat as dart.
function looksLikeDart(src: string): boolean {
  return /\b(class|void|final|var|Widget|build|return|extends|implements|@override)\b/.test(src);
}

function parseSegments(text: string): Segment[] {
  if (!text) return [];
  const out: Segment[] = [];
  let last = 0;
  FENCE_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
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

export interface AnswerTextProps {
  text: string | null | undefined;
  /** Typography overrides for the prose. Layout classes belong on the parent. */
  className?: string;
  codeClassName?: string;
}

/**
 * Renders an answer string. Prose carries `.answer-text` — the reading serif
 * at a 68ch measure — and inline ```fences``` are routed through CodeBlock.
 *
 * The class sits on the prose blocks rather than a wrapper on purpose: as an
 * ancestor it would also catch `.answer-text code`, which is meant for inline
 * code inside a sentence, and repaint every Shiki token inside a code figure.
 */
export default function AnswerText({ text, className, codeClassName }: AnswerTextProps) {
  const segments = useMemo(() => parseSegments(text || ''), [text]);

  if (segments.length === 0) {
    return null;
  }

  // Pure prose? Render the same single div as before — no extra DOM.
  if (segments.length === 1 && segments[0].kind === 'prose') {
    return <div className={cn('answer-text', className)}>{segments[0].value}</div>;
  }

  return (
    // Serif at the answer's own size so the wrapper's `ch` resolves to the same
    // measure the prose sets on itself — code figures then line up with the
    // right edge of the text instead of running the full container width.
    <div className="max-w-[68ch] space-y-4 font-serif text-[1.0625rem]">
      {segments.map((seg, i) => {
        if (seg.kind === 'prose') {
          // Trim only the leading/trailing newline that hugged a fence so the
          // gap collapses to the `space-y-4` rhythm.
          const trimmed = seg.value.replace(/^\n+/, '').replace(/\n+$/, '');
          if (!trimmed) return null;
          return (
            <div key={i} className={cn('answer-text', className)}>
              {trimmed}
            </div>
          );
        }
        if (seg.kind === 'pre') {
          return (
            <pre
              key={i}
              className="overflow-x-auto rounded-md border border-rule/12 bg-rule/4 p-3 font-mono text-[12.5px] leading-relaxed print:bg-transparent"
            >
              {seg.value}
            </pre>
          );
        }
        return (
          <CodeBlock key={i} code={seg.value} language={seg.lang} className={codeClassName} />
        );
      })}
    </div>
  );
}
