/**
 * "Will I be ready on the 20th?"
 *
 * The roadmap says where someone stands today and the SRS says what is due
 * today; neither answers the only question a person with an interview booked
 * actually has. FSRS can, because it models forgetting rather than just
 * scheduling: `recallAt` runs each card's curve forward to a date and returns
 * the odds of recalling it then.
 *
 * So a forecast is just that curve, evaluated on the target date, averaged over
 * the questions of each rung. A question that has never been studied forecasts
 * 0 — not "unknown". Someone who has not seen a card will not recall it, and
 * quietly excluding those would turn the headline into flattery.
 */
import { getCardState, readAll, recallAt } from './srs';

import type { ResolvedRung, Standing } from './roadmap';
import type { QuestionSummary as Question, Topic } from '../types/domain';

/**
 * The recall probability below which a question counts as needing work before
 * the date. 0.9 is what the scheduler itself aims for, so "at risk" means
 * exactly "the scheduler would want to have asked this again by then".
 */
export const READY_THRESHOLD = 0.9;

const DAY = 24 * 60 * 60 * 1000;

export interface RungForecast {
  rung: ResolvedRung;
  /** Mean predicted recall over the rung's questions on the target date, 0..1. */
  recall: number;
  /** Questions predicted below the threshold — the work this rung still needs. */
  atRisk: number;
  total: number;
  /** In the scope the headline is computed over. */
  inScope: boolean;
}

export interface WeakSpot {
  topic: Topic;
  atRisk: number;
  total: number;
}

export interface Readiness {
  /** Local end of the target day, ms epoch. */
  targetAt: number;
  /** Whole days from now until then; 0 when the date is today or past. */
  daysLeft: number;
  /** Mean predicted recall across the scope, 0..1. */
  recall: number;
  atRisk: number;
  total: number;
  /** Every rung of the track, in order, so the wall ahead is visible too. */
  perRung: RungForecast[];
  /** The topics carrying the most at-risk questions, worst first. */
  weakSpots: WeakSpot[];
  /** Reviews a day needed to clear the at-risk set before the date. */
  perDay: number;
}

/**
 * The target date as a moment: the end of that day in the user's own timezone,
 * because "my interview is on the 20th" means the whole of the 20th, and an
 * interview at 10am is better served by a forecast that does not quietly
 * assume midnight UTC.
 */
export function targetMoment(isoDate: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate || '');
  if (!match) return null;
  const [, y, m, d] = match;
  const at = new Date(Number(y), Number(m) - 1, Number(d), 23, 59, 59, 999).getTime();
  return Number.isFinite(at) ? at : null;
}

/** Whole days between now and the target, floored at 0. */
export function daysUntil(targetAt: number, now: number): number {
  return Math.max(0, Math.floor((targetAt - now) / DAY));
}

/**
 * Forecast one track against a date.
 *
 * The headline covers the rungs the user has passed plus the one they are on —
 * their claim about themselves, in other words. Rungs beyond that are still
 * reported per row, because seeing that Senior 2 forecasts 12% is the point of
 * a roadmap, but folding them into one number would drown the signal.
 */
export function forecast(
  rungs: ResolvedRung[],
  standing: Standing,
  targetAt: number,
  now: number = Date.now(),
): Readiness {
  const cards = readAll();
  const scopeEnd = Math.min(rungs.length, Math.max(1, standing.passedCount + 1));

  const perRung: RungForecast[] = [];
  const riskByTopic = new Map<number, WeakSpot>();
  let scopeRecallSum = 0;
  let scopeTotal = 0;
  let scopeAtRisk = 0;

  rungs.forEach((rung, index) => {
    const inScope = index < scopeEnd;
    let recallSum = 0;
    let atRisk = 0;

    for (const question of rung.questions) {
      const recall = recallAt(getCardState(question.id, cards), targetAt);
      recallSum += recall;
      if (recall < READY_THRESHOLD) {
        atRisk += 1;
        if (inScope) trackWeakSpot(riskByTopic, rung, question);
      }
    }

    perRung.push({
      rung,
      recall: rung.questions.length ? recallSum / rung.questions.length : 1,
      atRisk,
      total: rung.questions.length,
      inScope,
    });

    if (inScope) {
      scopeRecallSum += recallSum;
      scopeTotal += rung.questions.length;
      scopeAtRisk += atRisk;
    }
  });

  const daysLeft = daysUntil(targetAt, now);
  return {
    targetAt,
    daysLeft,
    recall: scopeTotal ? scopeRecallSum / scopeTotal : 1,
    atRisk: scopeAtRisk,
    total: scopeTotal,
    perRung,
    weakSpots: [...riskByTopic.values()]
      .sort((a, b) => b.atRisk - a.atRisk || a.topic.slug.localeCompare(b.topic.slug))
      .slice(0, 4),
    // Divide by the days that are actually left. On the day itself there is no
    // "per day" left to spread over, so the whole backlog is today's.
    perDay: Math.ceil(scopeAtRisk / Math.max(1, daysLeft)),
  };
}

/**
 * Tally an at-risk question against its topic. The rung already knows which
 * topic each of its nodes came from, which saves resolving `topic_id` against
 * the catalogue a second time.
 */
function trackWeakSpot(
  into: Map<number, WeakSpot>,
  rung: ResolvedRung,
  question: Question,
): void {
  const node = rung.nodes.find((n) => n.topic.id === question.topic_id);
  if (!node) return;
  const existing = into.get(node.topic.id);
  if (existing) {
    existing.atRisk += 1;
    return;
  }
  into.set(node.topic.id, { topic: node.topic, atRisk: 1, total: node.total });
}

/**
 * The questions to study first for a given date: the at-risk ones in scope,
 * weakest forecast first. `/study?ids=` takes this straight.
 */
export function atRiskQuestionIds(
  rungs: ResolvedRung[],
  standing: Standing,
  targetAt: number,
  limit = 20,
): number[] {
  const cards = readAll();
  const scopeEnd = Math.min(rungs.length, Math.max(1, standing.passedCount + 1));
  const scored: Array<{ id: number; recall: number }> = [];
  const seen = new Set<number>();

  for (let i = 0; i < scopeEnd; i += 1) {
    for (const question of rungs[i].questions) {
      if (seen.has(question.id)) continue;
      seen.add(question.id);
      const recall = recallAt(getCardState(question.id, cards), targetAt);
      if (recall < READY_THRESHOLD) scored.push({ id: question.id, recall });
    }
  }

  return scored
    .sort((a, b) => a.recall - b.recall)
    .slice(0, limit)
    .map((x) => x.id);
}
