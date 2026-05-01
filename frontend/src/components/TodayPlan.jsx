import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Brain, Sparkles, Flame, Target, Zap, Clock, ChevronRight,
} from 'lucide-react';
import { useQuestions, useTopics } from '../lib/queries.js';
import { getCardState } from '../lib/srs.js';
import { computeStreaks } from '../lib/activity.js';
import { useLang } from '../i18n/LangContext.jsx';
import { useContent } from '../i18n/content.js';
import { Button, Eyebrow, Pill } from '../ui/index.js';
import { cn } from '../lib/cn.js';
import { usePrefs } from '../store/prefs.js';
import { filterTopicsByPlatform, filterQuestionsByPlatform } from '../lib/platform.js';

const DAY = 24 * 60 * 60 * 1000;
const PLAN_LIMIT = 18;
const DUE_CAP = 12;
const WEAK_CAP = 4;
const FRESH_CAP = 4;
const SECONDS_PER_CARD = 60;

/**
 * Builds today's curated study plan: due cards first, then a sample from the
 * weakest topic, then a few fresh ones. Returns ids in plan order plus
 * breakdown counts for the UI.
 */
function buildPlan(questions, topics, now = Date.now()) {
  if (!questions.length) {
    return { ids: [], due: 0, weak: 0, fresh: 0, weakTopic: null, srsLearned: 0 };
  }

  const dueIds = [];
  const freshIds = [];
  let srsLearned = 0;

  // Pre-compute card states once
  const stateById = new Map();
  for (const q of questions) {
    const s = getCardState(q.id);
    stateById.set(q.id, s);
    if (s.reps > 0) srsLearned += 1;
    if (s.reps === 0 && !s.lastAt) {
      freshIds.push({ q, fresh: true });
    } else if (s.dueAt <= now) {
      dueIds.push({ q, lateness: now - s.dueAt });
    }
  }

  // Most-overdue first
  dueIds.sort((a, b) => b.lateness - a.lateness);
  const dueChosen = dueIds.slice(0, DUE_CAP).map((x) => x.q);

  // Build per-topic mastery to find the weakest topic that still has gaps
  const perTopic = new Map();
  for (const t of topics) {
    perTopic.set(t.id, {
      topic: t,
      total: 0,
      completed: 0,
      easeSum: 0,
      easeCount: 0,
      gapQuestions: [],
    });
  }
  for (const q of questions) {
    const row = perTopic.get(q.topic_id);
    if (!row) continue;
    row.total += 1;
    if (q.status === 'completed') row.completed += 1;
    const s = stateById.get(q.id);
    if (s.reps > 0) {
      row.easeSum += s.ease;
      row.easeCount += 1;
    }
    // Question is a "gap" if it's not completed and isn't already in the due list
    if (q.status !== 'completed') {
      row.gapQuestions.push({ q, ease: s.ease, reps: s.reps });
    }
  }

  const masteryFor = (row) => {
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
  let weakChosen = [];
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
  const takenSet = new Set([...dueChosen.map((q) => q.id), ...weakChosen.map((q) => q.id)]);
  const freshChosen = freshIds
    .map((x) => x.q)
    .filter((q) => !takenSet.has(q.id))
    .slice(0, FRESH_CAP);

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
  const streaks = useMemo(() => computeStreaks(), []);

  const total = plan.ids.length;
  const minutes = Math.max(1, Math.round((total * SECONDS_PER_CARD) / 60));

  const startPlan = () => {
    if (!total) return;
    const label = lang === 'ru' ? 'План на сегодня' : 'Today\'s plan';
    navigate(`/study?ids=${plan.ids.join(',')}&label=${encodeURIComponent(label)}`);
  };

  const empty = total === 0;
  const allCaughtUp = !empty && plan.due === 0 && plan.fresh === 0 && plan.weak === 0;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-rule/8 bg-paper-2 shadow-[0_1px_2px_0_rgb(var(--shadow)/0.06),0_12px_40px_-8px_rgb(var(--shadow)/0.10)]">
      {/* Aurora glow — large soft blob, brand→sky gradient, behind everything */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-gradient-to-br from-brand/30 via-brand-sky/20 to-transparent blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-16 -bottom-20 h-60 w-60 rounded-full bg-gradient-to-tr from-mint/20 via-brand/10 to-transparent blur-3xl"
      />

      <div className="relative flex flex-col gap-5 p-5 sm:flex-row sm:items-stretch sm:gap-7 sm:p-7">
        {/* LEFT — headline */}
        <div className="min-w-0 flex-1">
          <Eyebrow accent="brand">
            <Sparkles className="mr-1 inline h-3 w-3" />
            {lang === 'ru' ? 'План на сегодня' : 'Today\'s plan'}
          </Eyebrow>

          {empty ? (
            <h2 className="mt-3 font-display text-2xl font-medium leading-tight tracking-tight text-ink sm:text-3xl">
              {lang === 'ru' ? 'Поехали — добавь первый прогон' : 'Start — make your first pass'}
            </h2>
          ) : allCaughtUp ? (
            <h2 className="mt-3 font-display text-2xl font-medium leading-tight tracking-tight text-ink sm:text-3xl">
              {lang === 'ru' ? 'Догнал базу. Дальше — закрепление.' : 'All caught up. Reinforce.'}
            </h2>
          ) : (
            <h2 className="mt-3 font-display text-2xl font-medium leading-tight tracking-tight text-ink sm:text-3xl">
              <span className="num text-display-xs text-brand sm:text-display-sm">{total}</span>{' '}
              <span className="text-ink-2">
                {lang === 'ru'
                  ? `${total === 1 ? 'карточка' : total < 5 ? 'карточки' : 'карточек'} · ~${minutes} мин`
                  : `${total === 1 ? 'card' : 'cards'} · ~${minutes} min`}
              </span>
            </h2>
          )}

          {/* Composition */}
          {!empty && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {plan.due > 0 && (
                <Pill tone="amber" size="xs">
                  <Flame className="h-2.5 w-2.5" aria-hidden />
                  {plan.due} {lang === 'ru' ? 'к разбору' : 'due'}
                </Pill>
              )}
              {plan.weak > 0 && (
                <Pill tone="coral" size="xs">
                  <Target className="h-2.5 w-2.5" aria-hidden />
                  {plan.weak} {lang === 'ru' ? 'из слабой темы' : 'from weakest'}
                </Pill>
              )}
              {plan.fresh > 0 && (
                <Pill tone="brand" size="xs">
                  <Sparkles className="h-2.5 w-2.5" aria-hidden />
                  {plan.fresh} {lang === 'ru' ? 'новых' : 'fresh'}
                </Pill>
              )}
              {streaks.current > 0 && (
                <Pill tone="ghost" size="xs">
                  <Zap className="h-2.5 w-2.5" aria-hidden />
                  {streaks.current} {lang === 'ru'
                    ? (streaks.current === 1 ? 'день' : streaks.current < 5 ? 'дня' : 'дней')
                    : (streaks.current === 1 ? 'day' : 'days')}
                </Pill>
              )}
            </div>
          )}

          {/* Weak-topic hint */}
          {plan.weakTopic && (
            <button
              type="button"
              onClick={() => navigate(`/topic/${plan.weakTopic.slug}`)}
              className="mt-3 inline-flex items-center gap-1.5 text-left font-mono text-[11px] uppercase tracking-wider text-muted hover:text-ink"
            >
              <span className="text-coral">{lang === 'ru' ? 'фокус:' : 'focus:'}</span>
              <span className="truncate normal-case tracking-normal text-ink-2">
                {topicTitle(plan.weakTopic)}
              </span>
              <span className="font-mono tabular-nums text-coral">{plan.weakMastery}%</span>
              <ChevronRight className="h-3 w-3" aria-hidden />
            </button>
          )}
        </div>

        {/* RIGHT — CTA stack */}
        <div className="flex shrink-0 flex-col gap-2 sm:w-[220px] sm:justify-center">
          {empty ? (
            <Button variant="brand" size="md" className="w-full" onClick={() => navigate('/study')}>
              <Brain className="h-4 w-4" />
              {lang === 'ru' ? 'Открыть SRS' : 'Open SRS'}
            </Button>
          ) : allCaughtUp ? (
            <>
              <Button variant="brand" size="md" className="w-full" onClick={() => navigate('/mock')}>
                <Target className="h-4 w-4" />
                {lang === 'ru' ? 'Mock-собеседование' : 'Mock interview'}
              </Button>
              <Button
                variant="codex"
                size="sm"
                className="w-full"
                onClick={() => navigate('/study')}
              >
                <Brain className="h-4 w-4" />
                {lang === 'ru' ? 'Случайный набор' : 'Random set'}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="brand"
                size="md"
                className="w-full"
                onClick={startPlan}
              >
                <Brain className="h-4 w-4" />
                {lang === 'ru' ? 'Начать план' : 'Start plan'}
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="codex"
                  size="sm"
                  className={cn('w-full', plan.due === 0 && 'opacity-50')}
                  onClick={() => navigate('/study')}
                  disabled={plan.due === 0}
                >
                  <Flame className="h-3.5 w-3.5" />
                  {lang === 'ru' ? 'Только SRS' : 'SRS only'}
                </Button>
                <Button
                  variant="codex"
                  size="sm"
                  className="w-full"
                  onClick={() => navigate('/mock')}
                >
                  <Target className="h-3.5 w-3.5" />
                  Mock
                </Button>
              </div>
            </>
          )}

          <div className="mt-1 inline-flex items-center justify-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-2">
            <Clock className="h-2.5 w-2.5" aria-hidden />
            {plan.srsLearned}/{plan.srsTotal} {lang === 'ru' ? 'изучено' : 'learned'}
            {streaks.longest > streaks.current && (
              <>
                <span className="opacity-50">·</span>
                <span>{lang === 'ru' ? 'рекорд' : 'best'} {streaks.longest}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
