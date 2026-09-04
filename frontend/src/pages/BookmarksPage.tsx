import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuestions, useTopics } from '../lib/queries';
import { useBookmarkIds } from '../lib/useBookmark';
import { useLang } from '../i18n/LangContext';
import { useT } from '../i18n/ui';
import { useBookmarksCopy } from '../i18n/bookmarksPage';
import { Button, EmptyState, PageHeader, PageShell, Skeleton } from '../ui/index';
import QuestionCard from '../components/QuestionCard';
import { usePrefs } from '../store/prefs';
import { filterQuestionsByPlatform, PLATFORMS } from '../lib/platform';
import { useDocumentMeta } from '../lib/useDocumentMeta';

/**
 * Saved: the questions flagged for another pass, scoped to the stack chosen
 * in the header. One action — start a session over exactly this list.
 */
export default function BookmarksPage() {
  const navigate = useNavigate();
  const { lang } = useLang();
  const t = useT(lang);
  useDocumentMeta({ title: `${t.nav.saved} — Onsite` });
  const c = useBookmarksCopy(lang);
  const { data: questions = [], isLoading } = useQuestions();
  const { data: topics = [] } = useTopics();
  const ids = useBookmarkIds();
  const platform = usePrefs((s) => s.platform);

  const { bookmarked, ownCount } = useMemo(() => {
    const set = new Set(ids);
    const own = questions.filter((q) => set.has(q.id));
    return { bookmarked: filterQuestionsByPlatform(own, topics, platform), ownCount: own.length };
  }, [questions, topics, ids, platform]);
  const setPlatform = usePrefs((s) => s.setPlatform);
  const stackMeta = PLATFORMS.find((p) => p.key === platform);
  const stackLabel = stackMeta ? t[stackMeta.labelKey] : platform;

  if (isLoading) {
    return (
      <PageShell width="reading">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="mt-3 h-4 w-24" />
        <div className="mt-8 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      </PageShell>
    );
  }

  const startSession = () => {
    const sessionIds = bookmarked.map((q) => q.id).join(',');
    navigate(`/study?ids=${sessionIds}&label=${encodeURIComponent(t.nav.saved)}`);
  };

  return (
    <PageShell width="reading">
      <PageHeader
        title={t.nav.saved}
        subtitle={c.subtitle(bookmarked.length)}
        actions={bookmarked.length > 0 && (
          <Button variant="codex" size="sm" onClick={startSession}>
            {t.nav.startSession}
          </Button>
        )}
      />

      {bookmarked.length === 0 && ownCount > 0 ? (
        <EmptyState
          title={c.scopedTitle(ownCount)}
          body={c.scopedBody(stackLabel)}
          action={{ label: t.nav.allStacks, onClick: () => setPlatform('all') }}
        />
      ) : bookmarked.length === 0 ? (
        <EmptyState
          title={c.emptyTitle}
          body={c.emptyBody}
          action={{ label: t.nav.browseTopics, to: '/topics' }}
        />
      ) : (
        <div className="space-y-3">
          {bookmarked.map((q, i) => (
            <QuestionCard key={q.id} question={q} index={i} />
          ))}
        </div>
      )}
    </PageShell>
  );
}
