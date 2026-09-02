import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BookmarkX, Brain, Target } from 'lucide-react';
import { useQuestions, useTopics } from '../lib/queries';
import { useBookmarkIds } from '../lib/useBookmark';
import { clearAllBookmarks } from '../lib/bookmarks';
import { useLang } from '../i18n/LangContext';
import { useT } from '../i18n/ui';
import { Button, Eyebrow, Skeleton } from '../ui/index';
import QuestionCard from '../components/QuestionCard';
import PlatformFilter from '../components/PlatformFilter';
import { usePrefs } from '../store/prefs';
import { filterQuestionsByPlatform } from '../lib/platform';

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
        <div className="w-full px-4 py-6 sm:px-6 sm:py-10 lg:px-8 2xl:px-12">
          <Skeleton className="mb-5 h-4 w-32" />
          <Skeleton className="mb-2 h-3 w-20" />
          <Skeleton className="mb-1 h-9 w-2/3" />
          <Skeleton className="mb-6 h-3 w-1/3" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-page">
      <div className="w-full px-4 py-6 sm:px-6 sm:py-10 lg:px-8 2xl:px-12">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/')}
          className="-ml-2 mb-5 hidden text-muted hover:text-ink lg:inline-flex"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          {t.backToDashboard}
        </Button>

        <header className="mb-6 flex flex-col gap-4 border-b border-rule/12 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Eyebrow>{lang === 'ru' ? 'Закладки' : 'Bookmarks'}</Eyebrow>
            {/* The RU branch used to render the English string too — both
                arms of the ternary read 'Tough ones'. */}
            <h1 className="mt-2 font-display text-3xl font-semibold text-ink sm:text-4xl">
              {lang === 'ru' ? 'Сложные вопросы' : 'Tough ones'}
            </h1>
            <p className="mt-2 text-[15px] text-ink-2">
              <span className="num">{bookmarked.length}</span>{' '}
              {lang === 'ru' ? 'отмечено' : 'flagged for another pass'}
            </p>
          </div>
          {bookmarked.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="brand"
                size="sm"
                onClick={() => {
                  const drillIds = bookmarked.map((q) => q.id).join(',');
                  navigate(`/study?ids=${drillIds}&label=${encodeURIComponent(lang === 'ru' ? 'Закладки' : 'Bookmarks')}`);
                }}
              >
                <Brain className="h-3.5 w-3.5" aria-hidden />
                {lang === 'ru' ? 'Повторить закладки' : 'Drill bookmarks'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const mockIds = bookmarked.map((q) => q.id).join(',');
                  navigate(`/mock?ids=${mockIds}`);
                }}
              >
                <Target className="h-3.5 w-3.5" aria-hidden />
                Mock
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (window.confirm(lang === 'ru' ? 'Очистить все закладки?' : 'Clear all bookmarks?')) clearAllBookmarks();
                }}
                className="text-muted hover:text-coral"
              >
                <BookmarkX className="h-3.5 w-3.5" aria-hidden />
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
          <div className="codex-card mt-8 flex flex-col items-start gap-4 p-6 sm:items-center sm:p-10 sm:text-center">
            <div className="space-y-2">
              <h2 className="font-display text-2xl font-semibold text-ink sm:text-3xl">
                {lang === 'ru' ? 'Собери список на добивку' : 'Start a list worth coming back to'}
              </h2>
              <p className="max-w-sm text-[15px] leading-relaxed text-ink-2">
                {lang === 'ru'
                  ? 'Открой тему и добавь в закладки вопросы, которые хочешь прогнать перед собесом — они соберутся здесь.'
                  : 'Open a topic and bookmark the questions you want to run through before the interview. They collect here.'}
              </p>
            </div>
            <Button variant="brand" size="md" onClick={() => navigate('/')}>
              {lang === 'ru' ? 'Перейти к темам' : 'Browse topics'}
            </Button>
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
