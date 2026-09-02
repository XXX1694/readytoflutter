import { cn } from '../lib/cn';
import { TOPIC_ICONS_BY_SLUG, TOPIC_ICONS_BY_CATEGORY } from '../lib/topicIcons';

import type { Topic, Level } from '../types/domain';

const SIZES = {
  sm: 'h-7 w-7 text-[11px] rounded-md',
  md: 'h-10 w-10 text-sm rounded-lg',
  lg: 'h-14 w-14 text-xl rounded-xl',
} as const;

const ICON_SIZES = {
  sm: 'h-[15px] w-[15px]',
  md: 'h-5 w-5',
  lg: 'h-7 w-7',
} as const;

/**
 * Level is one axis, so it gets one: the depth of a single ink wash. Three
 * separate hues turned a list of topics into a legend you had to learn, and
 * the colours carried no meaning the title didn't already state.
 */
const TONES: Record<Level | 'default', string> = {
  junior:  'bg-ink/4 text-ink-2',
  mid:     'bg-ink/8 text-ink-2',
  senior:  'bg-ink/12 text-ink',
  default: 'bg-ink/6 text-muted',
};

export interface TopicGlyphProps {
  topic:
    | (Pick<Topic, 'title' | 'category' | 'level'> & Partial<Pick<Topic, 'slug'>>)
    | null
    | undefined;
  size?: keyof typeof SIZES;
  className?: string;
}

/**
 * A topic's tile: its lucide icon (see lib/topicIcons) on the level-tinted
 * wash. A topic the icon map does not know falls back to a two-letter
 * monogram, so the tile never comes up empty. The seed `icon` fields are
 * unused.
 */
export function TopicGlyph({ topic, size = 'md', className }: TopicGlyphProps) {
  // Plain table lookups, not a call — the static-components lint rule reads
  // a call whose result is rendered as a component made during render.
  const Icon = (topic?.slug && TOPIC_ICONS_BY_SLUG[topic.slug])
    || (topic?.category && TOPIC_ICONS_BY_CATEGORY[topic.category])
    || null;
  const title = topic?.title || topic?.category || '';
  const mark = title
    .split(/[\s/&-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('') || '?';

  const level = topic?.level;
  const tone = (level && TONES[level]) || TONES.default;

  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex shrink-0 items-center justify-center font-display font-semibold',
        SIZES[size],
        tone,
        className,
      )}
    >
      {Icon ? <Icon className={ICON_SIZES[size]} strokeWidth={1.75} /> : mark}
    </span>
  );
}
