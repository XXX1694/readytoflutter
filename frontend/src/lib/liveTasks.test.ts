import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { filterTasks, dealTask, readDraft, writeDraft, clearDraft } from './liveTasks';

import type { LiveTask, Topic } from '../types/domain';

const topic = (id: number, slug: string, category: string): Topic => ({
  id,
  slug,
  category,
  title: slug,
  level: 'junior',
  description: '',
  icon: '',
  order_index: id,
});

const topics: Topic[] = [
  topic(1, 'basic-widgets', 'Flutter'),
  topic(2, 'swift-concurrency', 'Swift'),
  topic(3, 'kotlin-basics', 'Kotlin'),
  topic(4, 'kmp', 'Cross-Platform'),
];

const task = (slug: string, topicSlug: string, difficulty: LiveTask['difficulty']): LiveTask => ({
  id: slug.length,
  slug,
  topic_slug: topicSlug,
  difficulty,
  minutes: 12,
  title: slug,
  prompt: 'Write it.',
  starter: '',
  code_language: 'dart',
});

const tasks: LiveTask[] = [
  task('debounce', 'basic-widgets', 'medium'),
  task('counter', 'basic-widgets', 'easy'),
  task('actor-cache', 'swift-concurrency', 'hard'),
  task('split-when', 'kotlin-basics', 'easy'),
  task('expect-actual', 'kmp', 'medium'),
];

describe('filterTasks', () => {
  it('returns every task for the "all" stack and mixed difficulty', () => {
    expect(filterTasks(tasks, topics, { platform: 'all', difficulty: 'all' })).toHaveLength(5);
  });

  it('maps topic slug → topic → category → platform', () => {
    const flutter = filterTasks(tasks, topics, { platform: 'flutter', difficulty: 'all' });
    expect(flutter.map((t) => t.slug)).toEqual(['debounce', 'counter']);

    const ios = filterTasks(tasks, topics, { platform: 'ios', difficulty: 'all' });
    expect(ios.map((t) => t.slug)).toEqual(['actor-cache']);

    const cross = filterTasks(tasks, topics, { platform: 'cross', difficulty: 'all' });
    expect(cross.map((t) => t.slug)).toEqual(['expect-actual']);
  });

  it('narrows by difficulty', () => {
    const easy = filterTasks(tasks, topics, { platform: 'all', difficulty: 'easy' });
    expect(easy.map((t) => t.slug)).toEqual(['counter', 'split-when']);
  });

  it('combines both filters', () => {
    expect(filterTasks(tasks, topics, { platform: 'flutter', difficulty: 'hard' })).toEqual([]);
    expect(filterTasks(tasks, topics, { platform: 'android', difficulty: 'easy' }).map((t) => t.slug))
      .toEqual(['split-when']);
  });

  it('drops a task whose topic is not in the list at all', () => {
    const orphan = [task('orphan', 'nowhere', 'easy')];
    expect(filterTasks(orphan, topics, { platform: 'flutter', difficulty: 'all' })).toEqual([]);
  });
});

describe('dealTask', () => {
  it('returns null for an empty pool', () => {
    expect(dealTask([], new Set())).toBeNull();
  });

  it('never deals a card already seen while unseen ones remain', () => {
    const seen = new Set(['debounce', 'counter', 'actor-cache', 'split-when']);
    for (let i = 0; i < 25; i += 1) {
      expect(dealTask(tasks, seen)?.slug).toBe('expect-actual');
    }
  });

  it('reshuffles the whole deck once every card has been seen', () => {
    const seen = new Set(tasks.map((t) => t.slug));
    const dealt = new Set<string>();
    for (let i = 0; i < 200; i += 1) {
      const next = dealTask(tasks, seen);
      expect(next).not.toBeNull();
      dealt.add(next!.slug);
    }
    expect(dealt.size).toBe(tasks.length);
  });

  it('eventually deals every unseen card', () => {
    const dealt = new Set<string>();
    for (let i = 0; i < 200; i += 1) dealt.add(dealTask(tasks, new Set())!.slug);
    expect(dealt.size).toBe(tasks.length);
  });
});

describe('the persisted draft', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it('round-trips an attempt', () => {
    writeDraft({ slug: 'debounce', code: 'class X {}', startedAt: 1_700_000_000_000 });
    expect(readDraft()).toEqual({ slug: 'debounce', code: 'class X {}', startedAt: 1_700_000_000_000 });
  });

  it('reads null when nothing is stored', () => {
    expect(readDraft()).toBeNull();
  });

  it('reads null rather than throwing on corrupt or half-shaped data', () => {
    localStorage.setItem('rtf:live:v1', '{ not json');
    expect(readDraft()).toBeNull();
    localStorage.setItem('rtf:live:v1', JSON.stringify({ slug: 'debounce' }));
    expect(readDraft()).toBeNull();
  });

  it('clears the attempt', () => {
    writeDraft({ slug: 'debounce', code: 'x', startedAt: 1 });
    clearDraft();
    expect(readDraft()).toBeNull();
  });

  it('survives a storage quota error without throwing', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    expect(() => writeDraft({ slug: 'debounce', code: 'x', startedAt: 1 })).not.toThrow();
  });
});
