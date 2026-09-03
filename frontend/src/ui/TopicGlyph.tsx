import { cn } from '../lib/cn';
import { TOPIC_ICONS_BY_SLUG, TOPIC_ICONS_BY_CATEGORY } from '../lib/topicIcons';
import { topicPlatform } from '../lib/platform';
import { stackTileStyle } from '../lib/stackMeta';

import type { Topic } from '../types/domain';

const SIZES = {
  sm: 'h-8 w-8 text-[11px] rounded-[9px]',
  md: 'h-10 w-10 text-sm rounded-[11px]',
  lg: 'h-14 w-14 text-xl rounded-2xl',
} as const;

const ICON_SIZES = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-7 w-7',
} as const;

export interface TopicGlyphProps {
  topic:
    | (Pick<Topic, 'title' | 'category' | 'level'> & Partial<Pick<Topic, 'slug'>>)
    | null
    | undefined;
  size?: keyof typeof SIZES;
  className?: string;
}

/**
 * A topic's tile: its lucide icon (see lib/topicIcons) on a soft wash of the
 * topic's *stack* colour — Dart Basics sits on Flutter blue, SwiftUI State
 * on Swift orange — so a mixed list reads by colour before it is read by
 * name, and a scoped list quietly agrees with the accent around it. A topic
 * the icon map does not know falls back to a two-letter monogram, so the
 * tile never comes up empty. The seed `icon` fields are unused.
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

  const stack = topicPlatform(topic);

  return (
    <span
      aria-hidden
      className={cn(
        'stack-tile stack-tile--soft font-display font-semibold',
        SIZES[size],
        className,
      )}
      style={stackTileStyle(stack)}
    >
      {Icon ? <Icon className={ICON_SIZES[size]} strokeWidth={1.9} /> : mark}
    </span>
  );
}
