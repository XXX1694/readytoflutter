import { memo, type ReactNode } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { cn } from '../lib/cn';
import CodeBlock from './CodeBlock';

// Languages we'd rather not feed to Shiki (ASCII trees, plain output, etc.).
const PROSE_LANGS = new Set(['', 'text', 'txt', 'plain', 'plaintext', 'tree', 'output']);

// Heuristic: a fence with no language but Dart-shaped tokens → treat as dart.
function looksLikeDart(src: string): boolean {
  return /\b(class|void|final|var|Widget|build|return|extends|implements|@override)\b/.test(src);
}

const textOf = (node: ReactNode): string => {
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map(textOf).join('');
  return '';
};

/**
 * The Markdown → Marginalia mapping. Every element the answers use gets the
 * reading treatment: serif prose at a 68ch measure, a grotesk run-in heading,
 * hanging bullets, mono code spans, Shiki for fenced code.
 */
const components: Components = {
  h1: ({ children }) => <h4 className="answer-heading">{children}</h4>,
  h2: ({ children }) => <h4 className="answer-heading">{children}</h4>,
  h3: ({ children }) => <h4 className="answer-heading">{children}</h4>,
  h4: ({ children }) => <h4 className="answer-heading">{children}</h4>,
  h5: ({ children }) => <h4 className="answer-heading">{children}</h4>,
  h6: ({ children }) => <h4 className="answer-heading">{children}</h4>,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-brand underline-offset-4 hover:underline">
      {children}
    </a>
  ),
  pre: ({ children }) => <>{children}</>,
  code: ({ className, children }) => {
    const match = /language-([\w+-]+)/.exec(className || '');
    const source = textOf(children).replace(/\n$/, '');
    // Inline code has no language class and no newline.
    if (!match && !source.includes('\n')) return <code>{children}</code>;
    const rawLang = (match?.[1] || '').toLowerCase();
    const lang = !rawLang || PROSE_LANGS.has(rawLang) ? (looksLikeDart(source) ? 'dart' : 'text') : rawLang;
    if (lang === 'text') {
      return (
        <pre className="overflow-x-auto rounded-md border border-rule/12 bg-rule/4 p-3 font-mono text-[12.5px] leading-relaxed print:bg-transparent">
          {source}
        </pre>
      );
    }
    return <CodeBlock code={source} language={lang} />;
  },
  table: ({ children }) => (
    <div className="overflow-x-auto">
      <table>{children}</table>
    </div>
  ),
};

const plugins = [remarkGfm, remarkBreaks];

export interface AnswerTextProps {
  text: string | null | undefined;
  /** Typography overrides for the prose. Layout classes belong on the parent. */
  className?: string;
  /** Kept for callers that pass it; code figures are styled by CodeBlock. */
  codeClassName?: string;
  /** Set the first paragraph a size up in the grotesk — the gist. Off for hints and excerpts. */
  lead?: boolean;
}

/**
 * Renders an answer written in Markdown. The first paragraph is the gist and
 * is set a size up in the grotesk; everything after it reads in the serif.
 * Styling lives in `.answer-md` (index.css) so the print and cheatsheet views
 * inherit it without their own rules.
 */
function AnswerText({ text, className, lead = true }: AnswerTextProps) {
  if (!text) return null;
  return (
    <div className={cn('answer-md', !lead && 'answer-md--plain', className)}>
      <ReactMarkdown remarkPlugins={plugins} components={components}>
        {text}
      </ReactMarkdown>
    </div>
  );
}

export default memo(AnswerText);
