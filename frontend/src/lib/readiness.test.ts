import { describe, it, expect, beforeEach } from 'vitest';
import { forecast, targetMoment, daysUntil, atRiskQuestionIds, READY_THRESHOLD } from './readiness';
import { rateCard, resetAll } from './srs';

import type { ResolvedRung, Standing } from './roadmap';
import type { QuestionSummary as Question, Topic } from '../types/domain';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 8, 1);

const topic = (id: number, slug: string): Topic =>
  ({ id, slug, title: slug, level: 'junior', order_index: id } as unknown as Topic);

const question = (id: number, topicId: number): Question =>
  ({ id, topic_id: topicId, difficulty: 'easy' } as unknown as Question);

/** A rung holding `questions`, all from one topic. */
const rung = (id: string, t: Topic, questions: Question[]): ResolvedRung =>
  ({
    id,
    band: 'junior',
    step: 1,
    title: id,
    nodes: [{
      key: `${t.slug}:easy`, topic: t, difficulty: ['easy'],
      questions, total: questions.length, completed: 0,
    }],
    questions,
    total: questions.length,
    completed: 0,
    pct: 0,
    passed: false,
  } as unknown as ResolvedRung);

const standing = (passedCount: number): Standing =>
  ({ passedCount, level: null, next: null, total: 0, completed: 0 } as Standing);

describe('readiness.targetMoment', () => {
  it('lands on the end of the day, so a date means the whole day', () => {
    const at = targetMoment('2026-10-20')!;
    const d = new Date(at);
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(9);
    expect(d.getDate()).toBe(20);
    expect(d.getHours()).toBe(23);
  });

  it('rejects anything that is not a plain date', () => {
    for (const bad of ['', 'tomorrow', '2026-13-01x', '20/10/2026']) {
      expect(targetMoment(bad)).toBeNull();
    }
  });
});

describe('readiness.daysUntil', () => {
  it('counts whole days and never goes negative', () => {
    expect(daysUntil(NOW + 10 * DAY, NOW)).toBe(10);
    expect(daysUntil(NOW + 0.5 * DAY, NOW)).toBe(0);
    expect(daysUntil(NOW - 5 * DAY, NOW)).toBe(0);
  });
});

describe('readiness.forecast', () => {
  const t1 = topic(1, 'dart');
  const t2 = topic(2, 'widgets');
  const r1 = rung('junior-1', t1, [question(1, 1), question(2, 1)]);
  const r2 = rung('junior-2', t2, [question(3, 2), question(4, 2)]);

  beforeEach(() => resetAll());

  it('forecasts 0 for a track nobody has studied', () => {
    // An unstudied question is not "unknown", it is "will not be recalled".
    // Excluding those would turn the headline into flattery.
    const f = forecast([r1, r2], standing(0), NOW + 14 * DAY, NOW);
    expect(f.recall).toBe(0);
    expect(f.atRisk).toBe(2);
    expect(f.total).toBe(2);
  });

  it('scopes the headline to what has been claimed plus the rung in progress', () => {
    const f = forecast([r1, r2], standing(1), NOW + 14 * DAY, NOW);
    expect(f.total).toBe(4);
    expect(f.perRung.map((r) => r.inScope)).toEqual([true, true]);

    const narrower = forecast([r1, r2], standing(0), NOW + 14 * DAY, NOW);
    expect(narrower.total).toBe(2);
    expect(narrower.perRung.map((r) => r.inScope)).toEqual([true, false]);
  });

  it('still reports the rungs beyond the scope, so the wall ahead is visible', () => {
    const f = forecast([r1, r2], standing(0), NOW + 14 * DAY, NOW);
    expect(f.perRung).toHaveLength(2);
    expect(f.perRung[1].total).toBe(2);
    expect(f.perRung[1].atRisk).toBe(2);
  });

  it('rates a freshly studied card as ready for a date that is close', () => {
    rateCard(1, 'easy', NOW);
    rateCard(2, 'easy', NOW);
    const f = forecast([r1], standing(0), NOW + 1 * DAY, NOW);
    expect(f.recall).toBeGreaterThan(READY_THRESHOLD);
    expect(f.atRisk).toBe(0);
  });

  it('and as at risk once the date is far enough out for it to decay', () => {
    // The whole point: the same card is ready for Tuesday and not for March.
    rateCard(1, 'easy', NOW);
    rateCard(2, 'easy', NOW);
    const soon = forecast([r1], standing(0), NOW + 1 * DAY, NOW);
    const later = forecast([r1], standing(0), NOW + 200 * DAY, NOW);
    expect(later.recall).toBeLessThan(soon.recall);
    expect(later.atRisk).toBe(2);
  });

  it('names the topics carrying the risk, worst first', () => {
    rateCard(3, 'easy', NOW); // one of widgets is safe
    const f = forecast([r1, r2], standing(1), NOW + 1 * DAY, NOW);
    expect(f.weakSpots[0].topic.slug).toBe('dart');
    expect(f.weakSpots[0].atRisk).toBe(2);
    expect(f.weakSpots[1].topic.slug).toBe('widgets');
    expect(f.weakSpots[1].atRisk).toBe(1);
  });

  it('spreads the backlog over the days that are actually left', () => {
    const f = forecast([r1, r2], standing(1), NOW + 4 * DAY, NOW);
    expect(f.atRisk).toBe(4);
    expect(f.daysLeft).toBe(4);
    expect(f.perDay).toBe(1);
  });

  it('puts the whole backlog on today when the date has arrived', () => {
    // Dividing by a zero day count would be Infinity on the one screen where
    // the number matters most.
    const f = forecast([r1, r2], standing(1), NOW, NOW);
    expect(f.daysLeft).toBe(0);
    expect(f.perDay).toBe(4);
    expect(Number.isFinite(f.perDay)).toBe(true);
  });

  it('reports a full score for an empty track rather than dividing by zero', () => {
    const f = forecast([], standing(0), NOW + 7 * DAY, NOW);
    expect(f.recall).toBe(1);
    expect(f.total).toBe(0);
    expect(f.perDay).toBe(0);
  });
});

describe('readiness.atRiskQuestionIds', () => {
  const t1 = topic(1, 'dart');
  const r1 = rung('junior-1', t1, [question(1, 1), question(2, 1), question(3, 1)]);

  beforeEach(() => resetAll());

  it('returns the weakest forecasts first, so a session opens on the real gap', () => {
    rateCard(1, 'easy', NOW);   // strongest
    rateCard(2, 'hard', NOW);   // weaker
    // 3 never studied — forecast 0, the weakest of all
    const ids = atRiskQuestionIds([r1], standing(0), NOW + 30 * DAY);
    expect(ids[0]).toBe(3);
    expect(ids).toContain(2);
  });

  it('leaves out what is already predicted safe', () => {
    rateCard(1, 'easy', NOW);
    rateCard(2, 'easy', NOW);
    rateCard(3, 'easy', NOW);
    expect(atRiskQuestionIds([r1], standing(0), NOW + 1 * DAY)).toEqual([]);
  });

  it('honours the limit', () => {
    expect(atRiskQuestionIds([r1], standing(0), NOW + 30 * DAY, 2)).toHaveLength(2);
  });
});
