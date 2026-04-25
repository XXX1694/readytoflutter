import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BookmarkX, Bookmark, Brain, Target } from 'lucide-react';
import { useQuestions } from '../lib/queries.js';
import { useBookmarkIds } from '../lib/useBookmark.js';
import { clearAllBookmarks } from '../lib/bookmarks.js';
import { useLang } from '../i18n/LangContext.jsx';
import { useT } from '../i18n/ui.js';
import { Button, FullPageLoader } from '../ui/index.js';
import QuestionCard from '../components/QuestionCard.jsx';

export default function BookmarksPage() {
  const navigate = useNavigate();
  const { lang } = useLang();
  const t = useT(lang);
  const { data: questions = [], isLoading } = useQuestions();
  const ids = useBookmarkIds();

  const bookmarked = useMemo(() => {
    const set = new Set(ids);
    return questions.filter((q) => set.has(q.id));
  }, [questions, ids]);

  if (isLoading) return <FullPageLoader />;

  return (
    <div className="bg-page">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/')}
          className="-ml-2 mb-5 text-muted hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t.backToDashboard}
        </Button>

        <header className="mb-6 flex flex-col gap-3 border-b-1.5 border-ink pb-5 sm:flex-row sm:items-end sm:justify-between">
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

        {bookmarked.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <Bookmark className="h-10 w-10 text-muted" aria-hidden />
            <p className="font-display text-xl text-ink">
              {lang === 'ru' ? 'Закладок пока нет' : 'No bookmarks yet'}
            </p>
            <p className="max-w-sm font-mono text-[11px] uppercase tracking-wider text-muted">
              {lang === 'ru'
                ? 'Жми звёздочку на любой карточке — здесь соберётся «список добить»'
                : 'Hit the star on any question — they pile up here as your "tough list"'}
            </p>
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
