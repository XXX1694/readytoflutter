import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ClipboardCopy, Check, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { useTopic } from '../lib/queries';
import { useLang } from '../i18n/LangContext';
import { useT } from '../i18n/ui';
import { useContent } from '../i18n/content';
import { Button, FullPageLoader } from '../ui/index';
import { cn } from '../lib/cn';
import { extractHint, shortenCode } from '../lib/hint';
import type { Difficulty, Question } from '../types/domain';

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
    document.title = `${safe} · Cheatsheet — Onsite`;
    return () => { document.title = original; };
  }, [topic, topicTitle]);

  const items = useMemo(() => {
    if (!topic?.questions) return [];
    return topic.questions.map((q: Question) => ({
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

  const diffTone: Record<Difficulty, string> = {
    easy: 'text-mint',
    medium: 'text-[rgb(var(--amber))]',
    hard: 'text-coral',
  };

  return (
    <div className="bg-paper text-ink">
      {/* On-screen toolbar. `print:hidden` rather than a `.print-hide` class:
          that class was never defined in index.css, so the toolbar used to
          print at the top of page one. */}
      <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-rule/12 bg-paper px-4 py-3 print:hidden sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="eyebrow shrink-0">{lang === 'ru' ? 'Шпаргалка' : 'Cheatsheet'}</span>
          <span className="truncate text-sm text-ink-2">{topicTitle(topic)}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleCopy}>
            {copied
              ? <Check className="h-3.5 w-3.5 text-mint" aria-hidden />
              : <ClipboardCopy className="h-3.5 w-3.5" aria-hidden />}
            {copied
              ? (lang === 'ru' ? 'Скопировано' : 'Copied')
              : (lang === 'ru' ? 'Копировать Markdown' : 'Copy Markdown')}
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-3.5 w-3.5" aria-hidden />
            {lang === 'ru' ? 'Печать' : 'Print'}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigate(`/topic/${slug}`)}>
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            {lang === 'ru' ? 'Назад' : 'Back'}
          </Button>
        </div>
      </div>

      {/* Cheatsheet body — 2-col grid on screen + print */}
      <article className="mx-auto max-w-[920px] px-5 py-6 sm:px-7 sm:py-8">
        {/* Cover */}
        <header className="mb-5 border-b border-rule/25 pb-3">
          <div className="flex items-baseline justify-between text-[12px] text-muted">
            <span>Onsite · {lang === 'ru' ? 'шпаргалка' : 'cheatsheet'}</span>
            <span>{today}</span>
          </div>
          <h1 className="mt-2 font-display text-2xl leading-tight text-ink sm:text-3xl">
            {topicTitle(topic)}
          </h1>
          <p className="mt-1 max-w-2xl font-serif text-[14px] leading-[1.6] text-ink-2">
            {topicDesc(topic)}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px] text-muted">
            <span>{levelT.label}</span>
            <span aria-hidden>·</span>
            <span>{items.length} {lang === 'ru' ? 'тезисов' : 'items'}</span>
            <span aria-hidden>·</span>
            <span>{lang === 'ru' ? 'короткая выжимка для скима' : 'compressed for a skim'}</span>
          </div>
        </header>

        {/* Items grid — two columns on paper as well as on screen. */}
        <ol className="grid grid-cols-1 gap-x-5 gap-y-3 print:grid-cols-2 sm:grid-cols-2">
          {items.map((it, i) => (
            <li
              key={it.id}
              className="break-inside-avoid rounded border border-rule/12 bg-paper-2 p-3 print:bg-transparent"
            >
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-[11px] tabular-nums text-muted">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h2 className="font-display text-[13.5px] font-semibold leading-snug text-ink">
                  {it.question}
                </h2>
              </div>
              <div className={cn('ml-7 mt-0.5 text-[11px]', diffTone[it.difficulty] || 'text-muted')}>
                {{ easy: t.easy, medium: t.medium, hard: t.hard }[it.difficulty] || it.difficulty}
              </div>
              {/* The hint is the one thing on this sheet that gets read rather
                  than scanned, so it takes the reading serif. */}
              <p className="ml-7 mt-1.5 font-serif text-[13px] leading-[1.55] text-ink-2">
                {it.hint}
              </p>
              {it.code && (
                <pre className="ml-7 mt-1.5 overflow-hidden whitespace-pre-wrap rounded border border-rule/12 bg-rule/4 p-1.5 font-mono text-[10.5px] leading-[1.45] text-ink print:bg-transparent">
                  <code>{it.code}</code>
                </pre>
              )}
            </li>
          ))}
        </ol>

        <footer className="mt-6 border-t border-rule/12 pt-2 text-center text-[11px] text-muted-2">
          Onsite · {topicTitle(topic)} · {today}
        </footer>
      </article>
    </div>
  );
}
