/**
 * Today's plan: the curated set of cards a session should open with — due
 * cards first, then a few from the weakest practised topic, then a few fresh
 * ones. Shared by the Today card, which names its size, and the bare /study
 * route (the tab bar's Start), so "Start" means the same set everywhere.
 */
import { getCardState, readAll } from './srs';

import type { Question, Topic, CardState } from '../types/domain';

// The three caps add up to the limit, so the headline and the breakdown agree.
export const PLAN_LIMIT = 20;
const DUE_CAP = 12;
const WEAK_CAP = 4;
const FRESH_CAP = 4;

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
export function buildPlan(questions: Question[], topics: Topic[], now: number = Date.now()): Plan {
  const empty: Plan = {
    ids: [], due: 0, weak: 0, fresh: 0,
    weakTopic: null, weakMastery: null, weakUntouched: false,
  };
  if (!questions.length) return empty;

  const dueCards: Array<{ q: Question; lateness: number }> = [];
  const freshCards: Question[] = [];

  // Pre-compute card states once: one localStorage read + parse for the whole
  // plan, not one per question (getCardState re-reads the map otherwise).
  const cardMap = readAll();
  const stateById = new Map<number, CardState>();
  for (const q of questions) {
    const s = getCardState(q.id, cardMap);
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
  const kept = new Set(all.map((q) => q.id));

  return {
    ids: all.map((q) => q.id),
    // Counted after the cut, so the breakdown never adds up to more than the headline.
    due: dueChosen.filter((q) => kept.has(q.id)).length,
    weak: weakChosen.filter((q) => kept.has(q.id)).length,
    fresh: freshChosen.filter((q) => kept.has(q.id)).length,
    weakTopic: weakRow?.topic || null,
    weakMastery: weakRow ? Math.round((weakRow.completed / weakRow.total) * 100) : null,
    // "Weakest" is a claim about practice. A topic nobody has opened is not
    // weak, it is untouched — and saying "0%" about it reads as a failure.
    weakUntouched: weakRow ? weakRow.completed === 0 && weakRow.easeCount === 0 : false,
  };
}

