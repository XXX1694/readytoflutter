import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BookmarkX, Bookmark, Brain, Target, Star, ArrowRight } from 'lucide-react';
import { useQuestions, useTopics } from '../lib/queries.js';
import { useBookmarkIds } from '../lib/useBookmark.js';
import { clearAllBookmarks } from '../lib/bookmarks.js';
import { useLang } from '../i18n/LangContext.jsx';
import { useT } from '../i18n/ui.js';
import { Button, Skeleton } from '../ui/index.js';
import QuestionCard from '../components/QuestionCard.jsx';
import PlatformFilter from '../components/PlatformFilter.jsx';
import { usePrefs } from '../store/prefs.js';
import { filterQuestionsByPlatform } from '../lib/platform.js';

export default function BookmarksPage() {
  const navigate = useNavigate();
  const { lang } = useLang();
  const t = useT(lang);
  const { data: questions = [], isLoading } = useQuestions();
  const { data: topics = [] } = useTopics();
  const ids = useBookmarkIds();
  const platform = usePrefs((s) => s.platform);

  const bookmarked = useMemo(() => {
    const set = new Set(ids);
    const own = questions.filter((q) => set.has(q.id));
    return filterQuestionsByPlatform(own, topics, platform);
  }, [questions, topics, ids, platform]);

  if (isLoading) {
    return (
      <div className="bg-page">
        <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
          <Skeleton className="mb-5 h-4 w-32" />
          <Skeleton className="mb-2 h-3 w-20" />
          <Skeleton className="mb-1 h-9 w-2/3" />
          <Skeleton className="mb-6 h-3 w-1/3" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-md" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-page">
      <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/')}
          className="-ml-2 mb-5 text-muted hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t.backToDashboard}
        </Button>

        <header className="mb-6 flex flex-col gap-3 border-b border-rule/15 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[rgb(var(--amber))]">
              ★ {lang === 'ru' ? 'Избранное' : 'Bookmarks'}
            </span>
            <h1 className="mt-2 font-display text-3xl font-medium tracking-tight text-ink sm:text-4xl">
              {lang === 'ru' ? 'Tough ones' : 'Tough ones'}
            </h1>
            <p className="mt-1 font-mono text-[11px] uppercase tracking-wider text-muted">
              {bookmarked.length} {lang === 'ru' ? 'отмечено' : 'flagged'}
            </p>
          </div>
          {bookmarked.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="brand"
                size="sm"
                onClick={() => {
                  const ids = bookmarked.map((q) => q.id).join(',');
                  navigate(`/study?ids=${ids}&label=${encodeURIComponent(lang === 'ru' ? 'Закладки' : 'Bookmarks')}`);
                }}
              >
                <Brain className="h-3.5 w-3.5" />
                {lang === 'ru' ? 'Повторить закладки' : 'Drill bookmarks'}
              </Button>
              <Button
                variant="codex"
                size="sm"
                onClick={() => {
                  const ids = bookmarked.map((q) => q.id).join(',');
                  navigate(`/mock?ids=${ids}`);
                }}
              >
                <Target className="h-3.5 w-3.5" />
                {lang === 'ru' ? 'Mock' : 'Mock'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (window.confirm(lang === 'ru' ? 'Очистить все закладки?' : 'Clear all bookmarks?')) clearAllBookmarks();
                }}
                className="text-muted hover:text-coral"
              >
                <BookmarkX className="h-3.5 w-3.5" />
                {lang === 'ru' ? 'Очистить' : 'Clear'}
              </Button>
            </div>
          )}
        </header>

        {/* Stack scope — useful once you bookmark across multiple platforms. */}
        <div className="mb-5">
          <PlatformFilter />
        </div>

        {bookmarked.length === 0 ? (
          <div className="relative mt-10 overflow-hidden rounded-3xl border border-rule/8 bg-paper-2 px-6 py-16 text-center sm:py-24">
            {/* Aurora glow behind the empty card */}
            <span aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-gradient-to-br from-amber/15 via-brand/10 to-transparent blur-3xl" />
            <span aria-hidden className="pointer-events-none absolute -left-20 -bottom-20 h-56 w-56 rounded-full bg-gradient-to-tr from-brand-sky/15 via-mint/8 to-transparent blur-3xl" />

            <div className="relative mx-auto flex flex-col items-center gap-4">
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber/20 to-amber/5 ring-1 ring-amber/30">
                <Star className="h-6 w-6 text-[rgb(var(--amber))]" aria-hidden />
              </span>
            <div className="space-y-1">
              <h2 className="font-display text-2xl font-medium tracking-tight text-ink sm:text-3xl">
                {lang === 'ru' ? 'Список «добить» пуст' : 'Your tough list is empty'}
              </h2>
              <p className="mx-auto max-w-sm text-sm text-ink-2">
                {lang === 'ru'
                  ? 'Жми ★ на любой карточке вопроса — сюда соберётся всё, что хочешь добить перед собесом.'
                  : 'Tap ★ on any question — anything you want to drill before the interview lands here.'}
              </p>
            </div>
              <Button variant="brand" size="md" onClick={() => navigate('/')}>
                <ArrowRight className="h-4 w-4" />
                {lang === 'ru' ? 'Перейти к темам' : 'Browse topics'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {bookmarked.map((q, i) => (
              <QuestionCard key={q.id} question={q} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
