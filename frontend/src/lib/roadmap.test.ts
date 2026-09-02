import { describe, it, expect } from 'vitest';
import staticData from '../../public/seed/static-data.json';

import {
  computeStanding,
  pickTrack,
  resolveTrack,
  rungLabel,
  tierLabel,
  PASS_THRESHOLD,
  ROADMAP_TRACKS,
} from './roadmap';
import { topicPlatform } from './platform';

import type { Question, Roadmap, Topic } from '../types/domain';

// ── Fixture ──────────────────────────────────────────────────────────────────

const topic = (id: number, slug: string): Topic => ({
  id, slug, title: slug, level: 'junior', category: 'Dart', description: '', icon: '', order_index: id,
});

const question = (id: number, topic_id: number, difficulty: Question['difficulty'], status?: Question['status']): Question => ({
  id, topic_id, order_index: id, difficulty, question: `q${id}`, answer: '', code_example: null, code_language: 'dart', status,
});

const TOPICS = [topic(1, 'a'), topic(2, 'b')];

const ROADMAP: Roadmap = {
  rungs: [
    { id: 'junior-1', band: 'junior', step: 1 },
    { id: 'junior-2', band: 'junior', step: 2 },
    { id: 'staff', band: 'staff', step: 1 },
  ],
  tracks: [
    {
      platform: 'flutter',
      rungs: {
        'junior-1': { title_en: 'One', title_ru: 'Один', nodes: [{ topic: 'a', difficulty: ['easy'] }] },
        'junior-2': { title_en: 'Two', title_ru: 'Два', nodes: [{ topic: 'a', difficulty: ['medium', 'hard'] }, { topic: 'b', difficulty: ['easy'] }] },
        staff: { title_en: 'Staff', title_ru: 'Стафф', nodes: [{ topic: 'b', difficulty: ['medium'] }] },
      },
    },
  ],
};

// a: 5 easy, 2 medium, 1 hard · b: 2 easy, 1 medium
const QUESTIONS: Question[] = [
  question(1, 1, 'easy', 'completed'),
  question(2, 1, 'easy', 'completed'),
  question(3, 1, 'easy', 'completed'),
  question(4, 1, 'easy', 'completed'),
  question(5, 1, 'easy', 'in_progress'),
  question(6, 1, 'medium'),
  question(7, 1, 'medium', 'completed'),
  question(8, 1, 'hard'),
  question(9, 2, 'easy'),
  question(10, 2, 'easy'),
  question(11, 2, 'medium', 'completed'),
];

describe('resolveTrack', () => {
  const rungs = resolveTrack(ROADMAP, 'flutter', TOPICS, QUESTIONS, 'en');

  it('keeps the seed rung order and picks the localised title', () => {
    expect(rungs.map((r) => r.id)).toEqual(['junior-1', 'junior-2', 'staff']);
    expect(rungs[0].title).toBe('One');
    expect(resolveTrack(ROADMAP, 'flutter', TOPICS, QUESTIONS, 'ru')[0].title).toBe('Один');
  });

  it('resolves each node to the topic questions at the listed tiers', () => {
    const two = rungs[1];
    expect(two.nodes.map((n) => n.key)).toEqual(['a:medium+hard', 'b:easy']);
    expect(two.nodes[0].questions.map((q) => q.id)).toEqual([6, 7, 8]);
    expect(two.questions.map((q) => q.id)).toEqual([6, 7, 8, 9, 10]);
  });

  it('tallies completed questions and marks a rung passed at the threshold', () => {
    const one = rungs[0];
    expect(one.total).toBe(5);
    expect(one.completed).toBe(4);
    expect(one.pct).toBe(80);
    expect(one.passed).toBe(true);
    expect(4 / 5).toBeGreaterThanOrEqual(PASS_THRESHOLD);

    const two = rungs[1];
    expect(two.completed).toBe(1);
    expect(two.passed).toBe(false);
  });

  it('returns nothing for a track the roadmap does not define', () => {
    expect(resolveTrack(ROADMAP, 'ios', TOPICS, QUESTIONS, 'en')).toEqual([]);
  });
});

describe('computeStanding', () => {
  it('walks passed rungs in sequence and stops at the first gap', () => {
    const rungs = resolveTrack(ROADMAP, 'flutter', TOPICS, QUESTIONS, 'en');
    const standing = computeStanding(rungs);
    // junior-1 passed, junior-2 not, staff passed (1/1) — but staff does not
    // count toward the level because junior-2 is still open.
    expect(rungs[2].passed).toBe(true);
    expect(standing.passedCount).toBe(1);
    expect(standing.level?.id).toBe('junior-1');
    expect(standing.next?.id).toBe('junior-2');
    expect(standing.total).toBe(11);
    expect(standing.completed).toBe(6);
  });

  it('reports no level before the first rung and no next once all are passed', () => {
    const none = computeStanding(resolveTrack(ROADMAP, 'flutter', TOPICS, QUESTIONS.map((q) => ({ ...q, status: undefined })), 'en'));
    expect(none.level).toBeNull();
    expect(none.next?.id).toBe('junior-1');

    const all = computeStanding(resolveTrack(ROADMAP, 'flutter', TOPICS, QUESTIONS.map((q) => ({ ...q, status: 'completed' as const })), 'en'));
    expect(all.passedCount).toBe(3);
    expect(all.level?.id).toBe('staff');
    expect(all.next).toBeNull();
  });
});

describe('labels', () => {
  const bands = { junior: 'Junior', mid: 'Middle', senior: 'Senior', staff: 'Staff' };
  const tiers = { easy: 'Foundations', medium: 'Core', hard: 'Advanced', all: 'Whole topic' };

  it('names rungs by band and step, and Staff without a number', () => {
    expect(rungLabel({ band: 'junior', step: 1 }, bands)).toBe('Junior 1');
    expect(rungLabel({ band: 'mid', step: 4 }, bands)).toBe('Middle 4');
    expect(rungLabel({ band: 'staff', step: 1 }, bands)).toBe('Staff');
  });

  it('names tiers, collapsing all three to the whole topic', () => {
    expect(tierLabel(['easy'], tiers)).toBe('Foundations');
    expect(tierLabel(['medium', 'hard'], tiers)).toBe('Core · Advanced');
    expect(tierLabel(['easy', 'medium', 'hard'], tiers)).toBe('Whole topic');
  });
});

describe('pickTrack', () => {
  it('prefers the explicit roadmap choice, then a track-shaped stack filter, then Flutter', () => {
    expect(pickTrack('android', 'ios')).toBe('android');
    expect(pickTrack(null, 'ios')).toBe('ios');
    expect(pickTrack(null, 'all')).toBe('flutter');
    expect(pickTrack(null, 'mobile')).toBeNull();
    expect(pickTrack(null, 'cross')).toBeNull();
  });
});

// ── The committed seed ───────────────────────────────────────────────────────
// Every question of a stack must sit in exactly one rung of that stack's
// track. This is the "every topic on the roadmap is covered by questions"
// guarantee, checked against the bundle the app actually ships.

describe('seed roadmap coverage', () => {
  const data = staticData as unknown as { topics: Topic[]; questions: Question[]; roadmap: Roadmap };

  it('ships sixteen rungs and a track per stack', () => {
    expect(data.roadmap.rungs).toHaveLength(16);
    expect(data.roadmap.tracks.map((t) => t.platform)).toEqual(ROADMAP_TRACKS);
  });

  it.each(ROADMAP_TRACKS)('%s: covers every question of its own stack exactly once, with no empty rung', (trackKey) => {
    const rungs = resolveTrack(data.roadmap, trackKey, data.topics, data.questions, 'en');
    expect(rungs).toHaveLength(16);

    const seen = new Map<number, string>();
    for (const rung of rungs) {
      expect(rung.total, `${trackKey}/${rung.id} is empty`).toBeGreaterThan(0);
      for (const node of rung.nodes) expect(node.total, `${trackKey}/${rung.id}/${node.key} is empty`).toBeGreaterThan(0);
      for (const q of rung.questions) {
        expect(seen.has(q.id), `question ${q.id} appears in both ${seen.get(q.id)} and ${rung.id}`).toBe(false);
        seen.set(q.id, rung.id);
      }
    }

    const ownTopicIds = new Set(data.topics.filter((t) => topicPlatform(t) === trackKey).map((t) => t.id));
    const uncovered = data.questions.filter((q) => ownTopicIds.has(q.topic_id) && !seen.has(q.id));
    expect(uncovered.map((q) => q.id)).toEqual([]);
  });
});
