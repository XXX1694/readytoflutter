import { describe, it, expect } from 'vitest';
import { resourcesForTopic } from './knowledge';
import type { Resource, Topic } from '../types/domain';

const topic = (over: Partial<Topic> = {}): Topic => ({
  id: 1,
  title: 'State Management',
  slug: 'state-management',
  level: 'mid',
  // 'State' maps to the flutter platform in lib/platform.ts.
  category: 'State',
  description: '',
  icon: '',
  order_index: 1,
  ...over,
});

let nextId = 100;
const resource = (over: Partial<Resource> = {}): Resource => ({
  id: nextId++,
  url: 'https://example.com',
  title_en: 'Untitled',
  platform: 'flutter',
  topics: [],
  ...over,
});

describe('resourcesForTopic', () => {
  it('returns nothing when no resource shares a tag with the topic', () => {
    const catalog = [
      resource({ title_en: 'Xcode tips', topics: ['xcode', 'signing'] }),
      resource({ title_en: 'Podcast', topics: ['career', 'jobs'] }),
    ];
    expect(resourcesForTopic(catalog, topic())).toEqual([]);
  });

  it('matches a hyphenated tag against the words of the topic', () => {
    const hit = resource({ title_en: 'Riverpod', topics: ['state-management'] });
    const miss = resource({ title_en: 'Fastlane', topics: ['ci-cd'] });
    expect(resourcesForTopic([miss, hit], topic()).map((r) => r.title_en)).toEqual(['Riverpod']);
  });

  it('matches singular and plural forms of a tag', () => {
    const catalog = [
      resource({ title_en: 'Widget catalog', topics: ['widgets'] }),
      resource({ title_en: 'Test guide', topics: ['testing'] }),
    ];
    const picked = resourcesForTopic(catalog, topic({ title: 'Basic Widget', slug: 'basic-widget' }));
    expect(picked.map((r) => r.title_en)).toEqual(['Widget catalog']);
  });

  it('ranks more tag overlap above less', () => {
    const one = resource({ title_en: 'One tag', topics: ['state'] });
    const two = resource({ title_en: 'Two tags', topics: ['state', 'management'] });
    expect(resourcesForTopic([one, two], topic()).map((r) => r.title_en))
      .toEqual(['Two tags', 'One tag']);
  });

  it('prefers a resource from the topic\'s own stack', () => {
    const offStack = resource({ title_en: 'Android state', platform: 'android', topics: ['state'] });
    const onStack = resource({ title_en: 'Flutter state', platform: 'flutter', topics: ['state'] });
    expect(resourcesForTopic([offStack, onStack], topic()).map((r) => r.title_en))
      .toEqual(['Flutter state', 'Android state']);
  });

  it('counts a cross-platform resource for a stack-specific topic, but below its own stack', () => {
    const wide = resource({ title_en: 'Mobile state', platform: 'mobile', topics: ['state'] });
    const off = resource({ title_en: 'iOS state', platform: 'ios', topics: ['state'] });
    const own = resource({ title_en: 'Flutter state', platform: 'flutter', topics: ['state'] });
    expect(resourcesForTopic([off, wide, own], topic()).map((r) => r.title_en))
      .toEqual(['Flutter state', 'Mobile state', 'iOS state']);
  });

  it('puts official docs first when the scores otherwise tie', () => {
    const community = resource({ title_en: 'Blog post', topics: ['state'] });
    const official = resource({ title_en: 'Official docs', topics: ['state'], official: true });
    expect(resourcesForTopic([community, official], topic()).map((r) => r.title_en))
      .toEqual(['Official docs', 'Blog post']);
  });

  it('returns at most `limit`, defaulting to three', () => {
    const catalog = Array.from({ length: 6 }, (_, i) =>
      resource({ title_en: `Item ${i}`, topics: ['state'] }));
    expect(resourcesForTopic(catalog, topic())).toHaveLength(3);
    expect(resourcesForTopic(catalog, topic(), 1).map((r) => r.title_en)).toEqual(['Item 0']);
    expect(resourcesForTopic(catalog, topic(), 0)).toEqual([]);
  });

  it('keeps catalogue order between resources that score the same', () => {
    const first = resource({ title_en: 'First', topics: ['state'] });
    const second = resource({ title_en: 'Second', topics: ['state'] });
    expect(resourcesForTopic([first, second], topic()).map((r) => r.title_en))
      .toEqual(['First', 'Second']);
  });
});
