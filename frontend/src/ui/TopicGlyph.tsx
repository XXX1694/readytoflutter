import { cn } from '../lib/cn';

import type { Topic, Level } from '../types/domain';

const SIZES = {
  sm: 'h-7 w-7 text-[11px] rounded-md',
  md: 'h-10 w-10 text-sm rounded-lg',
  lg: 'h-14 w-14 text-xl rounded-xl',
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
  topic: Pick<Topic, 'title' | 'category' | 'level'> | null | undefined;
  size?: keyof typeof SIZES;
  className?: string;
}

/** A monogram tile for a topic — the seed `icon` fields are unused. */
export function TopicGlyph({ topic, size = 'md', className }: TopicGlyphProps) {
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
      {mark}
    </span>
  );
}
