import { useEffect, useRef, useState } from 'react';
import { Copy, Check, Play } from 'lucide-react';
import { toast } from 'sonner';
import { highlightCode } from '../lib/highlighter';
import { usePrefs } from '../store/prefs';
import { useLang } from '../i18n/LangContext';
import { cn } from '../lib/cn';

export interface CodeBlockProps {
  code: string;
  language?: string;
  className?: string;
}

/** Shared shape for the two header actions — grotesk, sentence case, quiet. */
const ACTION =
  'inline-flex min-h-[36px] items-center gap-1.5 rounded px-2 text-[12px] font-medium ' +
  'transition-colors sm:h-7 sm:min-h-0';

/**
 * A code figure. It reads as an inset cut into the page — a hairline and a
 * faint ink wash, no shadow and no floating "window" chrome — because a
 * snippet inside an answer is part of the same sheet, not a card on top of it.
 */
export default function CodeBlock({ code, language = 'dart', className }: CodeBlockProps) {
  const theme = usePrefs((s) => s.theme);
  const { lang } = useLang();
  const [html, setHtml] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const cancelled = useRef(false);

  useEffect(() => {
    cancelled.current = false;
    highlightCode(code, language, theme === 'dark')
      .then((h) => { if (!cancelled.current) setHtml(h); })
      .catch(() => { if (!cancelled.current) setHtml(null); });
    return () => { cancelled.current = true; };
  }, [code, language, theme]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — the code is still selectable */
    }
  };

  // DartPad doesn't accept code via URL params (length limits), but copy +
  // open-in-new-tab is a clean fallback: the snippet is on the clipboard the
  // moment the user lands on dartpad.dev — paste runs.
  const openInDartPad = async () => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success(
        lang === 'ru'
          ? 'Код скопирован — вставь в DartPad'
          : 'Code copied — paste into DartPad',
      );
    } catch {
      toast.message(lang === 'ru' ? 'Открываем DartPad' : 'Opening DartPad');
    }
    window.open('https://dartpad.dev/', '_blank', 'noopener,noreferrer');
  };

  const isDart = language === 'dart';

  return (
    <div
      className={cn(
        'overflow-hidden rounded-md border border-rule/12 bg-rule/4 print:bg-transparent',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-rule/8 px-3 py-1">
        {/* Mono earns its place here: the language is ID-like data. */}
        <span className="font-mono text-[11px] text-muted">{language}</span>
        <div className="flex items-center gap-1 print:hidden">
          {isDart && (
            <button
              type="button"
              onClick={openInDartPad}
              title={lang === 'ru' ? 'Скопировать и открыть DartPad' : 'Copy and open DartPad'}
              className={cn(ACTION, 'text-brand hover:bg-brand/8')}
            >
              <Play className="h-3 w-3" aria-hidden />
              DartPad
            </button>
          )}
          <button
            type="button"
            onClick={copy}
            className={cn(ACTION, 'text-muted hover:bg-rule/8 hover:text-ink')}
          >
            {copied
              ? <Check className="h-3 w-3 text-mint" aria-hidden />
              : <Copy className="h-3 w-3" aria-hidden />}
            {copied
              ? (lang === 'ru' ? 'Скопировано' : 'Copied')
              : (lang === 'ru' ? 'Копировать' : 'Copy')}
          </button>
        </div>
      </div>
      {/* Shiki writes its token colours as inline styles, so print has to win
          with `!important` or a dark-theme snippet prints near-white on white. */}
      <div
        className={cn(
          'overflow-x-auto font-mono text-[13px] leading-[1.65]',
          '[&_pre]:!bg-transparent [&_pre]:p-3 sm:[&_pre]:p-4',
          'print:[&_pre]:!text-ink print:[&_span]:!text-ink',
        )}
      >
        {html ? (
          <div dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          <pre className="p-3 sm:p-4">{code}</pre>
        )}
      </div>
    </div>
  );
}
