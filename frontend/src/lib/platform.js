// Platform taxonomy — groups the catalog so the dashboard can split Flutter /
// iOS / Android / Cross-Platform / Mobile-wide instead of dumping everything
// into one list.
//
// Adding a new technology (e.g. React Native, KMP-Web, server backend) is a
// 3-line change here:
//   1. Push a new entry into `PLATFORMS` with key + dot color + i18n label key.
//   2. Add the new topic categories to `CATEGORY_TO_PLATFORM`.
//   3. Optionally tag knowledge-base resources with `platform: '<key>'`.
// PlatformFilter, Sidebar, MockPage, SearchPage, StudyPage and KnowledgePage
// all consume this list — so the new tech appears everywhere automatically.

export const PLATFORMS = [
  { key: 'all',     dot: 'bg-ink',    labelKey: 'platformAll',     descKey: 'platformDescAll' },
  { key: 'flutter', dot: 'bg-brand',  labelKey: 'platformFlutter', descKey: 'platformDescFlutter' },
  { key: 'ios',     dot: 'bg-plum',   labelKey: 'platformIos',     descKey: 'platformDescIos' },
  { key: 'android', dot: 'bg-mint',   labelKey: 'platformAndroid', descKey: 'platformDescAndroid' },
  { key: 'cross',   dot: 'bg-amber',  labelKey: 'platformCross',   descKey: 'platformDescCross' },
  { key: 'mobile',  dot: 'bg-coral',  labelKey: 'platformMobile',  descKey: 'platformDescMobile' },
];

export const PLATFORM_KEYS = PLATFORMS.map((p) => p.key);

// Concrete platform groups (everything except 'all') — used by Sidebar to
// build the topic tree.
export const PLATFORM_GROUPS = PLATFORMS.filter((p) => p.key !== 'all');

const CATEGORY_TO_PLATFORM = {
  // Flutter (original 23 topics — Dart language + Flutter framework + cross-cutting Flutter concerns)
  Dart: 'flutter',
  Flutter: 'flutter',
  State: 'flutter',
  Quality: 'flutter',
  Architecture: 'flutter',
  'CS Fundamentals': 'flutter',
  Native: 'flutter',
  DevOps: 'flutter',

  // iOS native
  Swift: 'ios',
  SwiftUI: 'ios',
  UIKit: 'ios',
  iOS: 'ios',

  // Android native
  Kotlin: 'android',
  Compose: 'android',
  Android: 'android',

  // Cross-platform tooling shared by both stores
  'Cross-Platform': 'cross',

  // Mobile-wide concerns that apply to every platform
  Mobile: 'mobile',
};

export function topicPlatform(topic) {
  if (!topic) return 'all';
  return CATEGORY_TO_PLATFORM[topic.category] || 'all';
}

export function filterTopicsByPlatform(topics, platform) {
  if (!platform || platform === 'all') return topics;
  return topics.filter((t) => topicPlatform(t) === platform);
}

// Questions carry topic_id; topics are needed to derive their platform.
export function filterQuestionsByPlatform(questions, topics, platform) {
  if (!platform || platform === 'all') return questions;
  const allowedTopicIds = new Set(
    filterTopicsByPlatform(topics, platform).map((t) => t.id),
  );
  return questions.filter((q) => allowedTopicIds.has(q.topic_id));
}

// Knowledge-base resources may carry an explicit `platform` field. Legacy
// rows authored before this taxonomy existed are treated as Flutter, since
// that's all the catalogue contained.
export function resourcePlatform(resource) {
  return resource?.platform || 'flutter';
}

export function filterResourcesByPlatform(resources, platform) {
  if (!platform || platform === 'all') return resources;
  return resources.filter((r) => resourcePlatform(r) === platform);
}
