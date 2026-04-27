import { useEffect, useRef, useState } from 'react';
import { Copy, Check, Play } from 'lucide-react';
import { toast } from 'sonner';
import { highlightCode } from '../lib/highlighter.js';
import { usePrefs } from '../store/prefs.js';
import { useLang } from '../i18n/LangContext.jsx';
import { cn } from '../lib/cn.js';

export default function CodeBlock({ code, language = 'dart', className }) {
  const theme = usePrefs((s) => s.theme);
  const { lang } = useLang();
  const [html, setHtml] = useState(null);
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
      /* ignore */
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
      toast.message(lang === 'ru' ? 'Открываем DartPad…' : 'Opening DartPad…');
    }
    window.open('https://dartpad.dev/', '_blank', 'noopener,noreferrer');
  };

  const isDart = language === 'dart';

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-rule/8 bg-paper-2',
        'shadow-[0_1px_2px_0_rgb(var(--shadow)/0.04),0_4px_16px_-4px_rgb(var(--shadow)/0.06)]',
        className,
      )}
    >
      {/* Atlas code header — three-dot 'window' on left + actions on right */}
      <div className="flex items-center justify-between gap-2 border-b border-rule/8 bg-rule/[0.02] px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="flex gap-1" aria-hidden>
            <span className="h-2 w-2 rounded-full bg-coral/60" />
            <span className="h-2 w-2 rounded-full bg-amber/60" />
            <span className="h-2 w-2 rounded-full bg-mint/60" />
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-2">
            {language}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {isDart && (
            <button
              type="button"
              onClick={openInDartPad}
              aria-label={lang === 'ru' ? 'Открыть в DartPad' : 'Open in DartPad'}
              title={lang === 'ru' ? 'Скопировать и открыть DartPad' : 'Copy + open DartPad'}
              className="inline-flex h-6 items-center gap-1 rounded-lg px-2 font-mono text-[10px] uppercase text-brand transition-colors hover:bg-brand/10"
            >
              <Play className="h-3 w-3" />
              DartPad
            </button>
          )}
          <button
            type="button"
            onClick={copy}
            aria-label="Copy code"
            className="inline-flex h-6 items-center gap-1 rounded-lg px-2 font-mono text-[10px] uppercase text-muted transition-colors hover:bg-rule/8 hover:text-ink"
          >
            {copied ? <Check className="h-3 w-3 text-mint" /> : <Copy className="h-3 w-3" />}
            {copied ? (lang === 'ru' ? 'Скоп.' : 'Copied') : (lang === 'ru' ? 'Копир.' : 'Copy')}
          </button>
        </div>
      </div>
      <div className="overflow-x-auto text-[13px] leading-relaxed [&_pre]:!bg-transparent [&_pre]:p-3 sm:text-sm sm:[&_pre]:p-4">
        {html ? (
          <div dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          <pre className="font-mono p-3 sm:p-4">{code}</pre>
        )}
      </div>
    </div>
  );
}
