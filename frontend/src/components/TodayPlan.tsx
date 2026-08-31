import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, Target, ChevronRight } from 'lucide-react';
import { useQuestions, useTopics } from '../lib/queries';
import { getCardState } from '../lib/srs';
import { useLang } from '../i18n/LangContext';
import { useContent } from '../i18n/content';
import { Button, Eyebrow } from '../ui/index';
import { usePrefs } from '../store/prefs';
import { filterTopicsByPlatform, filterQuestionsByPlatform } from '../lib/platform';

import type { Question, Topic, CardState } from '../types/domain';

const PLAN_LIMIT = 18;
const DUE_CAP = 12;
const WEAK_CAP = 4;
const FRESH_CAP = 4;
const SECONDS_PER_CARD = 60;

export interface Plan {
  /** Question ids, in the order they should be studied. */
  ids: number[];
  due: number;
  weak: number;
  fresh: number;
  weakTopic: Topic | null;
  weakMastery: number | null;
  srsLearned: number;
  srsTotal: number;
}

interface TopicRollup {
  topic: Topic;
  total: number;
  completed: number;
  easeSum: number;
  easeCount: number;
  gapQuestions: Array<{ q: Question; ease: number; reps: number }>;
}

/**
 * Builds today's curated study plan: due cards first, then a sample from the
 * weakest topic, then a few fresh ones. Returns ids in plan order plus
 * breakdown counts for the UI.
 */
function buildPlan(questions: Question[], topics: Topic[], now: number = Date.now()): Plan {
  const empty: Plan = {
    ids: [], due: 0, weak: 0, fresh: 0,
    weakTopic: null, weakMastery: null,
    srsLearned: 0, srsTotal: questions.length,
  };
  if (!questions.length) return empty;

  const dueCards: Array<{ q: Question; lateness: number }> = [];
  const freshCards: Question[] = [];
  let srsLearned = 0;

  // Pre-compute card states once
  const stateById = new Map<number, CardState>();
  for (const q of questions) {
    const s = getCardState(q.id);
    stateById.set(q.id, s);
    if (s.reps > 0) srsLearned += 1;
    if (s.reps === 0 && !s.lastAt) {
      freshCards.push(q);
    } else if (s.dueAt <= now) {
      dueCards.push({ q, lateness: now - s.dueAt });
    }
  }

  // Most-overdue first
  dueCards.sort((a, b) => b.lateness - a.lateness);
  const dueChosen = dueCards.slice(0, DUE_CAP).map((x) => x.q);

  // Build per-topic mastery to find the weakest topic that still has gaps
  const perTopic = new Map<number, TopicRollup>();
  for (const topic of topics) {
    perTopic.set(topic.id, {
      topic, total: 0, completed: 0, easeSum: 0, easeCount: 0, gapQuestions: [],
    });
  }
  for (const q of questions) {
    const row = perTopic.get(q.topic_id);
    if (!row) continue;
    row.total += 1;
    if (q.status === 'completed') row.completed += 1;
    const s = stateById.get(q.id)!;
    if (s.reps > 0) {
      row.easeSum += s.ease;
      row.easeCount += 1;
    }
    // Question is a "gap" if it's not completed and isn't already in the due list
    if (q.status !== 'completed') {
      row.gapQuestions.push({ q, ease: s.ease, reps: s.reps });
    }
  }

  const masteryFor = (row: TopicRollup): number => {
    if (row.total === 0) return 100;
    const compScore = (row.completed / row.total) * 100;
    if (row.easeCount === 0) return Math.round(compScore);
    const easeScore = Math.max(0, Math.min(100, ((row.easeSum / row.easeCount - 1.3) / 1.7) * 100));
    return Math.round(compScore * 0.6 + easeScore * 0.4);
  };

  const weakRow = [...perTopic.values()]
    .filter((r) => r.total >= 3 && r.gapQuestions.length > 0 && masteryFor(r) < 80)
    .sort((a, b) => masteryFor(a) - masteryFor(b))[0];

  // Pick weak-topic candidates not already in due
  const dueSet = new Set(dueChosen.map((q) => q.id));
  let weakChosen: Question[] = [];
  if (weakRow) {
    weakChosen = weakRow.gapQuestions
      .filter((g) => !dueSet.has(g.q.id))
      // Prefer cards with low ease (=struggling); fall back to fresh
      .sort((a, b) => {
        if (a.reps === 0 && b.reps > 0) return -1;
        if (b.reps === 0 && a.reps > 0) return 1;
        return a.ease - b.ease;
      })
      .slice(0, WEAK_CAP)
      .map((g) => g.q);
  }

  // Fresh: any never-seen question not already in due/weak
  const takenSet = new Set([...dueChosen, ...weakChosen].map((q) => q.id));
  const freshChosen = freshCards.filter((q) => !takenSet.has(q.id)).slice(0, FRESH_CAP);

  const all = [...dueChosen, ...weakChosen, ...freshChosen].slice(0, PLAN_LIMIT);

  return {
    ids: all.map((q) => q.id),
    due: dueChosen.length,
    weak: weakChosen.length,
    fresh: freshChosen.length,
    weakTopic: weakRow?.topic || null,
    weakMastery: weakRow ? masteryFor(weakRow) : null,
    srsLearned,
    srsTotal: questions.length,
  };
}

/**
 * The one card on the dashboard that tells you what to do next.
 *
 * Its composition used to be four coloured chips, each with an icon, a count
 * and a word — a control panel for three numbers. It reads as a sentence now,
 * and the marker sits on the card count because that is the figure the button
 * beneath acts on. Nothing else here is coloured.
 */
export default function TodayPlan() {
  const navigate = useNavigate();
  const { lang } = useLang();
  const { topicTitle } = useContent(lang);
  const { data: allQuestions = [] } = useQuestions();
  const { data: allTopics = [] } = useTopics();
  const platform = usePrefs((s) => s.platform);

  // Scope today's plan to the currently-selected platform so an iOS-focused
  // user doesn't get Flutter cards in their session, and vice versa.
  const topics = useMemo(
    () => filterTopicsByPlatform(allTopics, platform),
    [allTopics, platform],
  );
  const questions = useMemo(
    () => filterQuestionsByPlatform(allQuestions, allTopics, platform),
    [allQuestions, allTopics, platform],
  );

  const plan = useMemo(() => buildPlan(questions, topics), [questions, topics]);

  const total = plan.ids.length;
  const minutes = Math.max(1, Math.round((total * SECONDS_PER_CARD) / 60));

  const startPlan = (): void => {
    if (!total) return;
    const label = lang === 'ru' ? 'План на сегодня' : 'Today\'s plan';
    navigate(`/study?ids=${plan.ids.join(',')}&label=${encodeURIComponent(label)}`);
  };

  const empty = total === 0;
  const allCaughtUp = !empty && plan.due === 0 && plan.fresh === 0 && plan.weak === 0;
  const weakTopic = plan.weakTopic;

  // Composition, as a sentence rather than a rack of chips.
  const parts: string[] = [];
  if (plan.due > 0) parts.push(`${plan.due} ${lang === 'ru' ? 'к разбору' : 'due'}`);
  if (plan.weak > 0) parts.push(`${plan.weak} ${lang === 'ru' ? 'из слабой темы' : 'from your weakest topic'}`);
  if (plan.fresh > 0) parts.push(`${plan.fresh} ${lang === 'ru' ? 'новых' : 'new'}`);

  return (
    <div className="codex-card p-5 sm:p-7">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
        {/* LEFT — what today is */}
        <div className="min-w-0 flex-1">
          <Eyebrow>{lang === 'ru' ? 'План на сегодня' : 'Today\'s plan'}</Eyebrow>

          <h2 className="mt-2 font-display text-2xl font-semibold leading-tight text-ink sm:text-3xl">
            {empty ? (
              lang === 'ru' ? 'Начни с первого прогона' : 'Start with a first pass'
            ) : allCaughtUp ? (
              lang === 'ru' ? 'База закрыта — дальше закрепление' : 'Caught up — time to reinforce'
            ) : (
              <>
                <span className="relative inline-block">
                  {/* Highlighter stroke, sized to the digits: the `.marker`
                      utility is tuned for body copy and sits below the
                      baseline at headline sizes. */}
                  <span
                    aria-hidden
                    className="absolute inset-x-[-0.08em] bottom-[0.02em] top-[0.16em] bg-[rgb(var(--marker)/0.55)] dark:bg-[rgb(var(--marker)/0.28)]"
                  />
                  <span className="num relative">{total}</span>
                </span>{' '}
                <span className="text-ink-2">
                  {lang === 'ru'
                    ? `${total === 1 ? 'карточка' : total < 5 ? 'карточки' : 'карточек'} · ~${minutes} мин`
                    : `${total === 1 ? 'card' : 'cards'} · ~${minutes} min`}
                </span>
              </>
            )}
          </h2>

          {parts.length > 0 && (
            <p className="mt-2.5 text-[15px] leading-relaxed text-ink-2">{parts.join(' · ')}</p>
          )}

          {weakTopic && (
            <button
              type="button"
              onClick={() => navigate(`/topic/${weakTopic.slug}`)}
              className="mt-3 inline-flex max-w-full items-center gap-1.5 text-left text-[13px] text-muted hover:text-ink"
            >
              <span>{lang === 'ru' ? 'Слабее всего:' : 'Weakest right now:'}</span>
              <span className="truncate text-ink-2">{topicTitle(weakTopic)}</span>
              <span className="num shrink-0">{plan.weakMastery}%</span>
              <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
            </button>
          )}
        </div>

        {/* RIGHT — the actions */}
        <div className="flex shrink-0 flex-col gap-2 sm:w-[220px]">
          {empty ? (
            <Button variant="brand" size="md" className="w-full" onClick={() => navigate('/study')}>
              <Brain className="h-4 w-4" aria-hidden />
              {lang === 'ru' ? 'Открыть SRS' : 'Open SRS'}
            </Button>
          ) : allCaughtUp ? (
            <>
              <Button variant="brand" size="md" className="w-full" onClick={() => navigate('/mock')}>
                <Target className="h-4 w-4" aria-hidden />
                {lang === 'ru' ? 'Mock-собеседование' : 'Mock interview'}
              </Button>
              <Button variant="outline" size="sm" className="w-full" onClick={() => navigate('/study')}>
                {lang === 'ru' ? 'Случайный набор' : 'Random set'}
              </Button>
            </>
          ) : (
            <>
              <Button variant="brand" size="md" className="w-full" onClick={startPlan}>
                <Brain className="h-4 w-4" aria-hidden />
                {lang === 'ru' ? 'Начать план' : 'Start plan'}
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => navigate('/study')}
                  disabled={plan.due === 0}
                >
                  {lang === 'ru' ? 'Только SRS' : 'SRS only'}
                </Button>
                <Button variant="outline" size="sm" className="w-full" onClick={() => navigate('/mock')}>
                  <Target className="h-3.5 w-3.5" aria-hidden />
                  Mock
                </Button>
              </div>
            </>
          )}

          <p className="mt-1 text-center text-[13px] text-muted">
            <span className="num">{plan.srsLearned}</span>
            <span className="num text-muted-2"> / {plan.srsTotal}</span>{' '}
            {lang === 'ru' ? 'изучено' : 'learned'}
          </p>
        </div>
      </div>
    </div>
  );
}
