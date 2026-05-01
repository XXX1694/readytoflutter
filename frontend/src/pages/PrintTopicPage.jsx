import { useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTopic } from '../lib/queries.js';
import { useLang } from '../i18n/LangContext.jsx';
import { useT } from '../i18n/ui.js';
import { useContent } from '../i18n/content.js';
import { FullPageLoader } from '../ui/index.js';
import AnswerText from '../components/AnswerText.jsx';
import CodeBlock from '../components/CodeBlock.jsx';

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
    document.title = `${safe} — prepiroshi`;
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
    <div className="print-view bg-paper text-ink">
      {/* On-screen toolbar — hidden in print */}
      <div className="print-hide sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-rule bg-paper px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-brand">
            {lang === 'ru' ? 'Печать / PDF' : 'Print / PDF'}
          </span>
          <span className="text-sm text-ink-2">{topicTitle(topic)}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-xl border border-rule/12 bg-paper-2 px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-wider text-ink transition-all duration-200 hover:-translate-y-0.5 hover:border-rule/25 hover:shadow-[0_2px_4px_-1px_rgb(var(--shadow)/0.08)]"
          >
            {lang === 'ru' ? 'Печать снова' : 'Print again'}
          </button>
          <button
            type="button"
            onClick={() => navigate(`/topic/${slug}`)}
            className="rounded-xl px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-wider text-muted hover:text-ink"
          >
            {lang === 'ru' ? 'Назад' : 'Back'}
          </button>
        </div>
      </div>

      {/* Printable content */}
      <article className="mx-auto max-w-[720px] px-6 py-8 sm:px-8 sm:py-10">
        {/* Cover header */}
        <header className="mb-6 border-b-2 border-rule/15 pb-4">
          <div className="flex items-baseline justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
            <span>prepiroshi</span>
            <span>{today}</span>
          </div>
          <h1 className="mt-2 font-display text-2xl font-medium leading-tight tracking-tight text-ink sm:text-3xl">
            {topicTitle(topic)}
          </h1>
          <p className="mt-1 text-sm text-ink-2">{topicDesc(topic)}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-muted">
            <span>{levelT.label}</span>
            <span>·</span>
            <span>{questions.length} {lang === 'ru' ? 'вопросов' : 'questions'}</span>
          </div>
        </header>

        {/* Questions — natural flow, no forced gaps */}
        <ol className="list-none">
          {questions.map((q, i) => {
            const difficultyLabel = { easy: t.easy, medium: t.medium, hard: t.hard }[q.difficulty] || q.difficulty;
            return (
              <li key={q.id} className="print-question mb-5">
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-sm tabular-nums text-brand">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h2 className="font-display text-base font-semibold leading-snug tracking-tight text-ink sm:text-lg">
                    {questionText(q)}
                  </h2>
                </div>
                <div className="ml-9 mt-0.5 font-mono text-[10px] uppercase tracking-wider text-muted">
                  {difficultyLabel}
                </div>

                <div className="ml-9 mt-2">
                  <AnswerText
                    text={answerText(q)}
                    className="answer-text text-[12.5px] leading-[1.55] text-ink-2"
                  />

                  {q.code_example && (
                    <div className="mt-2">
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

        <footer className="mt-8 border-t border-rule pt-3 text-center font-mono text-[10px] uppercase tracking-wider text-muted-2">
          prepiroshi · {topicTitle(topic)} · {today}
        </footer>
      </article>
    </div>
  );
}
