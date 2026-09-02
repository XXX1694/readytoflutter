import { useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTopic } from '../lib/queries';
import { useLang } from '../i18n/LangContext';
import { useT } from '../i18n/ui';
import { useContent } from '../i18n/content';
import { Button, FullPageLoader } from '../ui/index';
import AnswerText from '../components/AnswerText';
import InlineMarkdown from '../components/InlineMarkdown';
import CodeBlock from '../components/CodeBlock';
import type { Question } from '../types/domain';

/**
 * Clean printable view for a topic. The page renders ALL questions fully
 * expanded with answers + code, no app chrome. The browser's print dialog is
 * triggered automatically once the layout is ready, so the user can either
 * print on paper or save as PDF — same UX, native font rendering, selectable
 * text on the resulting PDF (no rasterization tradeoffs).
 *
 * Print CSS lives in index.css under @media print.
 */
export default function PrintTopicPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { lang } = useLang();
  const t = useT(lang);
  const { topicTitle, topicDesc, questionText, answerText } = useContent(lang);
  const { data: topic, isLoading, error } = useTopic(slug);
  const printed = useRef(false);

  // Set document.title — the browser uses it as the suggested PDF filename.
  // Sanitize forbidden characters that some OSes strip from filenames.
  useEffect(() => {
    if (!topic) return;
    const original = document.title;
    const safe = topicTitle(topic).replace(/[\\/:*?"<>|]+/g, ' ').trim();
    document.title = `${safe} — Onsite`;
    return () => { document.title = original; };
  }, [topic, topicTitle]);

  // Fire the print dialog once the content is in the DOM.
  useEffect(() => {
    if (isLoading || error || !topic) return;
    if (printed.current) return;
    printed.current = true;
    // One frame of layout, then a tiny delay so fonts/images settle.
    // 350ms is long enough that the browser picks up the new document.title
    // for the suggested filename.
    const id = setTimeout(() => window.print(), 350);
    return () => clearTimeout(id);
  }, [isLoading, error, topic]);

  if (isLoading) return <FullPageLoader />;
  if (error || !topic) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-coral">{t.topicNotFound}</p>
      </div>
    );
  }

  const questions = topic.questions || [];
  const levelT = t[topic.level];
  const today = new Date().toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <div className="bg-paper text-ink">
      {/* On-screen toolbar. `print:hidden` rather than a `.print-hide` class:
          that class was never defined in index.css, so the toolbar used to
          print at the top of page one. */}
      <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-rule/12 bg-paper px-4 py-3 print:hidden sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="eyebrow shrink-0">{lang === 'ru' ? 'Печать / PDF' : 'Print / PDF'}</span>
          <span className="truncate text-sm text-ink-2">{topicTitle(topic)}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            {lang === 'ru' ? 'Печать снова' : 'Print again'}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigate(`/topic/${slug}`)}>
            {lang === 'ru' ? 'Назад' : 'Back'}
          </Button>
        </div>
      </div>

      {/* Printable content */}
      <article className="mx-auto max-w-[720px] px-6 py-8 sm:px-8 sm:py-10">
        {/* Cover header */}
        <header className="mb-6 border-b border-rule/25 pb-4">
          <div className="flex items-baseline justify-between text-[12px] text-muted">
            <span>Onsite</span>
            <span>{today}</span>
          </div>
          <h1 className="mt-2 font-display text-2xl leading-tight text-ink sm:text-3xl">
            {topicTitle(topic)}
          </h1>
          <p className="mt-1 font-serif text-[15px] leading-[1.6] text-ink-2">{topicDesc(topic)}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px] text-muted">
            <span>{levelT.label}</span>
            <span aria-hidden>·</span>
            <span>{questions.length} {lang === 'ru' ? 'вопросов' : 'questions'}</span>
          </div>
        </header>

        {/* Questions — natural flow, no forced gaps */}
        <ol className="list-none">
          {questions.map((q: Question, i: number) => {
            const difficultyLabel = { easy: t.easy, medium: t.medium, hard: t.hard }[q.difficulty] || q.difficulty;
            return (
              <li key={q.id} className="mb-5 break-inside-avoid">
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-sm tabular-nums text-muted">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h2 className="font-display text-base font-semibold leading-snug text-ink sm:text-lg">
                    <InlineMarkdown text={questionText(q)} />
                  </h2>
                </div>
                <div className="ml-9 mt-0.5 text-[12px] text-muted">{difficultyLabel}</div>

                <div className="ml-9 mt-2">
                  {/* `.answer-text` sets 17px for on-screen reading; a revision
                      sheet wants the same serif at a denser size, so the size
                      (and only the size) is forced down here. */}
                  <AnswerText text={answerText(q)} className="!text-[13.5px]" />

                  {q.code_example && (
                    <div className="mt-2 max-w-[68ch]">
                      <CodeBlock
                        code={q.code_example}
                        language={q.code_language || 'dart'}
                      />
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>

        <footer className="mt-8 border-t border-rule/12 pt-3 text-center text-[11px] text-muted-2">
          Onsite · {topicTitle(topic)} · {today}
        </footer>
      </article>
    </div>
  );
}
