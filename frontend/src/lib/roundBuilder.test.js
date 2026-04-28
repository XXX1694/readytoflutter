import { describe, it, expect } from 'vitest';
import { buildRound, chainConcepts } from './roundBuilder.js';

const Q = (id, difficulty, tags) => ({ id, difficulty, tags });

describe('buildRound', () => {
  it('returns [] for falsy/empty input', () => {
    expect(buildRound(null)).toEqual([]);
    expect(buildRound([])).toEqual([]);
  });

  it('returns all questions sorted easy→hard when pool is smaller than count', () => {
    const pool = [Q(1, 'hard'), Q(2, 'easy'), Q(3, 'medium')];
    const out = buildRound(pool, 5);
    expect(out.map((q) => q.id)).toEqual([2, 3, 1]);
  });

  it('caps at requested count', () => {
    const pool = Array.from({ length: 12 }, (_, i) => Q(i + 1, 'easy', 'a,b'));
    const out = buildRound(pool, 5);
    expect(out.length).toBe(5);
  });

  it('prefers tag-overlapping questions over isolated ones', () => {
    const pool = [
      Q(1, 'easy',   'state'),
      Q(2, 'medium', 'state,bloc'),
      Q(3, 'medium', 'state,provider'),
      Q(4, 'hard',   'state,riverpod'),
      Q(5, 'easy',   'unrelated-isolated-tag'),
      Q(6, 'easy',   'state,bloc'),
    ];
    const out = buildRound(pool, 5);
    const ids = out.map((q) => q.id);
    // The fully isolated question (id 5) should NOT be picked when 5 alternatives
    // share the dominant "state" cluster.
    expect(ids).not.toContain(5);
  });

  it('output is sorted easy → medium → hard', () => {
    const pool = [
      Q(1, 'hard',   'a'),
      Q(2, 'medium', 'a,b'),
      Q(3, 'easy',   'a'),
      Q(4, 'medium', 'b'),
      Q(5, 'easy',   'a,b'),
      Q(6, 'hard',   'b'),
    ];
    const out = buildRound(pool, 5);
    const order = ['easy', 'medium', 'hard'];
    let prev = -1;
    for (const q of out) {
      const idx = order.indexOf(q.difficulty);
      expect(idx).toBeGreaterThanOrEqual(prev);
      prev = idx;
    }
  });
});

describe('chainConcepts', () => {
  it('returns the most-frequent tags first, capped to max', () => {
    const chain = [
      Q(1, 'easy',   'state,bloc'),
      Q(2, 'medium', 'state,provider'),
      Q(3, 'hard',   'state,riverpod'),
    ];
    const out = chainConcepts(chain, 3);
    expect(out[0]).toBe('state');
    expect(out.length).toBeLessThanOrEqual(3);
  });

  it('handles empty / tagless questions gracefully', () => {
    expect(chainConcepts([])).toEqual([]);
    expect(chainConcepts([Q(1, 'easy')])).toEqual([]);
  });
});
