/**
 * The roadmap: sixteen rungs — Junior 1–5, Middle 1–5, Senior 1–5, Staff —
 * per stack, each rung a set of (topic × difficulty) nodes that resolve to
 * real questions. The seed (backend/data/seed/roadmap.json) only names topics
 * and tiers; this module joins it with the loaded catalogue and the user's
 * progress so the page can show a tally per rung and place the user on it.
 *
 * Progress is the questions' own `status` field, so it works identically for a
 * signed-in user (joined server-side) and an anonymous one (localStorage).
 */
import type {
  Difficulty,
  PlatformKey,
  QuestionSummary as Question,
  Roadmap,
  RoadmapBand,
  RoadmapRung,
  RoadmapTrackKey,
  Topic,
} from '../types/domain';

export const ROADMAP_TRACKS: RoadmapTrackKey[] = ['flutter', 'ios', 'android'];
export const ROADMAP_BANDS: RoadmapBand[] = ['junior', 'mid', 'senior', 'staff'];

/** A rung counts as passed once this share of its questions is completed. */
export const PASS_THRESHOLD = 0.8;

function isRoadmapTrack(key: PlatformKey | null | undefined): key is RoadmapTrackKey {
  return key === 'flutter' || key === 'ios' || key === 'android';
}

/**
 * Which track to show: the one last chosen on the roadmap page, else the
 * global stack filter when it names a track, else Flutter for "everything"
 * (the first track is as good a default as any when no stack was excluded).
 * Null for Cross-platform and Mobile: they have no roadmap of their own, and
 * Today showing another stack's standing as the user's would be a lie. The
 * roadmap page, which has track chips in view, falls back to Flutter itself.
 */
export function pickTrack(roadmapTrack: RoadmapTrackKey | null, platform: PlatformKey): RoadmapTrackKey | null {
  if (roadmapTrack) return roadmapTrack;
  if (isRoadmapTrack(platform)) return platform;
  return platform === 'all' ? 'flutter' : null;
}

export interface ResolvedNode {
  /** Unique within a rung: `<topic slug>:<tiers>`. */
  key: string;
  topic: Topic;
  difficulty: Difficulty[];
  questions: Question[];
  total: number;
  completed: number;
}

export interface ResolvedRung extends RoadmapRung {
  /** Localised rung title from the track. */
  title: string;
  nodes: ResolvedNode[];
  /** Every question in the rung, in node order. */
  questions: Question[];
  total: number;
  completed: number;
  /** 0–100, rounded. */
  pct: number;
  passed: boolean;
}

export interface Standing {
  /** Rungs passed in sequence from the first, stopping at the first gap. */
  passedCount: number;
  /** The last rung passed in sequence — the user's level — or null before the first. */
  level: ResolvedRung | null;
  /** The rung to work on next: the first not yet passed, or null once all are. */
  next: ResolvedRung | null;
  total: number;
  completed: number;
}

const isCompleted = (q: Question): boolean => q.status === 'completed';

export function resolveTrack(
  roadmap: Roadmap,
  trackKey: RoadmapTrackKey,
  topics: Topic[],
  questions: Question[],
  lang: 'en' | 'ru',
): ResolvedRung[] {
  const track = roadmap.tracks.find((t) => t.platform === trackKey);
  if (!track) return [];

  const topicBySlug = new Map(topics.map((t) => [t.slug, t]));
  const questionsByTopic = new Map<number, Question[]>();
  for (const q of questions) {
    const list = questionsByTopic.get(q.topic_id);
    if (list) list.push(q);
    else questionsByTopic.set(q.topic_id, [q]);
  }

  return roadmap.rungs.map((rung) => {
    const spec = track.rungs[rung.id];
    const nodes: ResolvedNode[] = [];
    for (const node of spec?.nodes ?? []) {
      const topic = topicBySlug.get(node.topic);
      if (!topic) continue;
      const matched = (questionsByTopic.get(topic.id) ?? [])
        .filter((q) => node.difficulty.includes(q.difficulty));
      nodes.push({
        key: `${topic.slug}:${node.difficulty.join('+')}`,
        topic,
        difficulty: node.difficulty,
        questions: matched,
        total: matched.length,
        completed: matched.filter(isCompleted).length,
      });
    }
    const all = nodes.flatMap((n) => n.questions);
    const total = all.length;
    const completed = all.filter(isCompleted).length;
    return {
      ...rung,
      title: (lang === 'ru' ? spec?.title_ru : spec?.title_en) || spec?.title_en || rung.id,
      nodes,
      questions: all,
      total,
      completed,
      pct: total > 0 ? Math.round((completed / total) * 100) : 0,
      passed: total > 0 && completed / total >= PASS_THRESHOLD,
    };
  });
}

export function computeStanding(rungs: ResolvedRung[]): Standing {
  let passedCount = 0;
  while (passedCount < rungs.length && rungs[passedCount].passed) passedCount += 1;
  return {
    passedCount,
    level: passedCount > 0 ? rungs[passedCount - 1] : null,
    next: rungs[passedCount] ?? null,
    total: rungs.reduce((s, r) => s + r.total, 0),
    completed: rungs.reduce((s, r) => s + r.completed, 0),
  };
}

/** "Junior 1", "Middle 4", "Staff". */
export function rungLabel(
  rung: Pick<RoadmapRung, 'band' | 'step'>,
  bandNames: Record<string, string>,
): string {
  const band = bandNames[rung.band] ?? rung.band;
  return rung.band === 'staff' ? band : `${band} ${rung.step}`;
}

/** "Foundations", "Foundations · Core", "Whole topic". */
export function tierLabel(difficulty: Difficulty[], tierNames: Record<string, string>): string {
  if (difficulty.length >= 3) return tierNames.all ?? '';
  return difficulty.map((d) => tierNames[d] ?? d).join(' · ');
}
