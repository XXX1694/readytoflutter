import { useMemo, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuestions, useTopics } from '../lib/queries';
import { getCardState } from '../lib/srs';
import { useLang } from '../i18n/LangContext';
import { useT } from '../i18n/ui';
import { useContent } from '../i18n/content';
import { useHomeCopy } from '../i18n/homePage';
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
  /** The weak topic has nothing completed and nothing in the SRS queue yet. */
  weakUntouched: boolean;
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
    weakTopic: null, weakMastery: null, weakUntouched: false,
  };
  if (!questions.length) return empty;

  const dueCards: Array<{ q: Question; lateness: number }> = [];
  const freshCards: Question[] = [];

  // Pre-compute card states once
  const stateById = new Map<number, CardState>();
  for (const q of questions) {
    const s = getCardState(q.id);
    stateById.set(q.id, s);
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
    // "Weakest" is a claim about practice. A topic nobody has opened is not
    // weak, it is untouched — and saying "0%" about it reads as a failure.
    weakUntouched: weakRow ? weakRow.completed === 0 && weakRow.easeCount === 0 : false,
  };
}

export interface TodayPlanProps {
  /**
   * Shown above the headline. Today passes nothing (its own `h1` already says
   * "Today"); the landings pass it, since there the `h1` names the stack.
   */
  eyebrow?: ReactNode;
}

/**
 * The one card on Today. Four lines and one button: what today is, what it is
 * made of, where you are weakest, and the way in. Everything it used to also
 * carry — an SRS-only button, a mock button, an "x / 636 learned" tally — was
 * a second and third answer to a question the page asks once.
 */
export default function TodayPlan({ eyebrow }: TodayPlanProps) {
  const navigate = useNavigate();
  const { lang } = useLang();
  const t = useT(lang);
  const c = useHomeCopy(lang);
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
  const empty = total === 0;
  const allCaughtUp = !empty && plan.due === 0 && plan.fresh === 0 && plan.weak === 0;
  const weakTopic = plan.weakTopic;

  // The deep link the button opens. Same contract as before: an explicit id
  // list plus the label the session header shows.
  const start = (): void => {
    if (empty) {
      navigate('/study');
      return;
    }
    navigate(`/study?ids=${plan.ids.join(',')}&label=${encodeURIComponent(t.nav.today)}`);
  };

  // Composition, as a sentence rather than a rack of chips.
  const parts: string[] = [];
  if (plan.due > 0) parts.push(t.nav.due(plan.due));
  if (plan.weak > 0) parts.push(c.weak(plan.weak));
  if (plan.fresh > 0) parts.push(c.fresh(plan.fresh));

  return (
    <div className="codex-card p-5 sm:p-7">
      {eyebrow && <Eyebrow className="mb-2">{eyebrow}</Eyebrow>}

      <h2 className="font-display text-[26px] font-semibold leading-tight text-ink sm:text-[30px]">
        {empty ? c.planEmpty : allCaughtUp ? c.planCaughtUp : <span className="num">{c.plan(total, minutes)}</span>}
      </h2>

      {parts.length > 0 && (
        <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{parts.join(' · ')}</p>
      )}

      {weakTopic && (
        <Link
          to={`/topic/${weakTopic.slug}`}
          className="mt-2 inline-block max-w-full truncate rounded-sm text-[13px] text-muted transition-colors hover:text-ink"
        >
          {plan.weakUntouched
            ? c.untouched(topicTitle(weakTopic))
            : c.weakest(topicTitle(weakTopic), plan.weakMastery ?? 0)}
        </Link>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3 sm:mt-6">
        <Button variant="brand" size="md" className="w-full sm:w-auto" onClick={start}>
          {t.nav.startSession}
        </Button>
        <Link to="/mock" className="rounded-sm text-[13px] text-brand hover:underline">
          {t.nav.timed}
        </Link>
      </div>
    </div>
  );
}
