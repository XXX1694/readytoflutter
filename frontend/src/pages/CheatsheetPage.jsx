import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ClipboardCopy, Check, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { useTopic } from '../lib/queries.js';
import { useLang } from '../i18n/LangContext.jsx';
import { useT } from '../i18n/ui.js';
import { useContent } from '../i18n/content.js';
import { FullPageLoader } from '../ui/index.js';
import { extractHint, shortenCode } from '../lib/hint.js';

/**
 * Cheatsheet — a compressed, glanceable reference for a topic. Shows every
 * question with just its hint (first sentence) and an optional short code
 * snippet, in a 2-column grid that fits an A4 page. Designed for the
 * pre-interview skim use case where the full Print/PDF view is too long.
 *
 * Lives outside <Layout/> so it can print clean (same routing pattern as
 * /topic/:slug/print).
 */
export default function CheatsheetPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { lang } = useLang();
  const t = useT(lang);
  const { topicTitle, topicDesc, questionText, answerText } = useContent(lang);
  const { data: topic, isLoading, error } = useTopic(slug);
  const [copied, setCopied] = useState(false);

  // Set document title — affects PDF filename if user prints
  useEffect(() => {
    if (!topic) return;
    const original = document.title;
    const safe = topicTitle(topic).replace(/[\\/:*?"<>|]+/g, ' ').trim();
    document.title = `${safe} · Cheatsheet — prepiroshi`;
    return () => { document.title = original; };
  }, [topic, topicTitle]);

  const items = useMemo(() => {
    if (!topic?.questions) return [];
    return topic.questions.map((q) => ({
      id: q.id,
      question: questionText(q),
      hint: extractHint(answerText(q)),
      difficulty: q.difficulty,
      code: q.code_example ? shortenCode(q.code_example, 6) : null,
      codeLang: q.code_language || 'dart',
    }));
  }, [topic, questionText, answerText]);

  const handleCopy = async () => {
    if (!topic) return;
    const md = [
      `# ${topicTitle(topic)} — Cheatsheet`,
      '',
      topicDesc(topic),
      '',
      ...items.map((it, i) => {
        const parts = [
          `### ${String(i + 1).padStart(2, '0')}. ${it.question}`,
          '',
          it.hint,
        ];
        if (it.code) {
          parts.push('', '```' + it.codeLang, it.code, '```');
        }
        return parts.join('\n');
      }),
    ].join('\n\n');
    try {
      await navigator.clipboard.writeText(md);
      setCopied(true);
      toast.success(lang === 'ru' ? 'Скопировано как Markdown' : 'Copied as Markdown');
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error(lang === 'ru' ? 'Не удалось скопировать' : 'Copy failed');
    }
  };

  if (isLoading) return <FullPageLoader />;
  if (error || !topic) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-coral">{t.topicNotFound}</p>
      </div>
    );
  }

  const today = new Date().toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  const levelT = t[topic.level];

  const diffTone = {
    easy: 'text-mint',
    medium: 'text-[rgb(var(--amber))]',
    hard: 'text-[rgb(var(--coral))]',
  };

  return (
    <div className="print-view bg-paper text-ink">
      {/* On-screen toolbar — hidden in print */}
      <div className="print-hide sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-rule bg-paper px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-brand">
            Cheatsheet
          </span>
          <span className="text-sm text-ink-2">{topicTitle(topic)}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 rounded-xl border border-rule/12 bg-paper-2 px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-wider text-ink-2 transition-all duration-200 hover:-translate-y-0.5 hover:border-rule/25 hover:text-ink hover:shadow-[0_2px_4px_-1px_rgb(var(--shadow)/0.08)]"
          >
            {copied ? <Check className="h-3 w-3 text-mint" /> : <ClipboardCopy className="h-3 w-3" />}
            {copied
              ? (lang === 'ru' ? 'Скопировано' : 'Copied')
              : (lang === 'ru' ? 'Копия Markdown' : 'Copy Markdown')}
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-rule/12 bg-paper-2 px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-wider text-ink transition-all duration-200 hover:-translate-y-0.5 hover:border-rule/25 hover:shadow-[0_2px_4px_-1px_rgb(var(--shadow)/0.08)]"
          >
            <Printer className="h-3 w-3" />
            {lang === 'ru' ? 'Печать' : 'Print'}
          </button>
          <button
            type="button"
            onClick={() => navigate(`/topic/${slug}`)}
            className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-wider text-muted hover:text-ink"
          >
            <ArrowLeft className="h-3 w-3" />
            {lang === 'ru' ? 'Назад' : 'Back'}
          </button>
        </div>
      </div>

      {/* Cheatsheet body — 2-col grid on screen + print */}
      <article className="mx-auto max-w-[920px] px-5 py-6 sm:px-7 sm:py-8">
        {/* Cover */}
        <header className="mb-5 border-b-2 border-rule/15 pb-3">
          <div className="flex items-baseline justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
            <span>prepiroshi · Cheatsheet</span>
            <span>{today}</span>
          </div>
          <h1 className="mt-2 font-display text-2xl font-medium leading-tight tracking-tight text-ink sm:text-3xl">
            {topicTitle(topic)}
          </h1>
          <p className="mt-1 max-w-2xl text-[13px] text-ink-2">{topicDesc(topic)}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-muted">
            <span>{levelT.label}</span>
            <span>·</span>
            <span>{items.length} {lang === 'ru' ? 'тезисов' : 'items'}</span>
            <span>·</span>
            <span className="text-coral">{lang === 'ru' ? 'короткая выжимка — для скима' : 'compressed — skim-ready'}</span>
          </div>
        </header>

        {/* Items grid */}
        <ol className="grid grid-cols-1 gap-x-5 gap-y-3 sm:grid-cols-2 cheatsheet-grid">
          {items.map((it, i) => (
            <li
              key={it.id}
              className="cheatsheet-item break-inside-avoid rounded border border-rule bg-paper-2 p-3"
            >
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-[11px] tabular-nums text-brand">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h2 className="font-display text-[13.5px] font-semibold leading-snug tracking-tight text-ink">
                  {it.question}
                </h2>
              </div>
              <div className="ml-7 mt-0.5 flex items-center gap-2 font-mono text-[9px] uppercase tracking-wider text-muted">
                <span className={diffTone[it.difficulty] || 'text-muted'}>
                  {{ easy: t.easy, medium: t.medium, hard: t.hard }[it.difficulty] || it.difficulty}
                </span>
              </div>
              <p className="mt-1.5 ml-7 text-[12px] leading-[1.55] text-ink-2">
                {it.hint}
              </p>
              {it.code && (
                <pre className="mt-1.5 ml-7 overflow-hidden rounded border border-rule bg-paper p-1.5 font-mono text-[10px] leading-[1.4] text-ink whitespace-pre-wrap">
                  <code>{it.code}</code>
                </pre>
              )}
            </li>
          ))}
        </ol>

        <footer className="mt-6 border-t border-rule pt-2 text-center font-mono text-[9px] uppercase tracking-wider text-muted-2">
          prepiroshi · {topicTitle(topic)} · cheatsheet · {today}
        </footer>
      </article>
    </div>
  );
}
