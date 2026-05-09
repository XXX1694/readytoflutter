import { cn } from '../lib/cn';

import type { Topic, Level } from '../types/domain';

const SIZES = {
  sm: 'h-7 w-7 text-[11px] rounded-lg',
  md: 'h-10 w-10 text-sm rounded-xl',
  lg: 'h-14 w-14 text-2xl rounded-2xl',
} as const;

const TONES: Record<Level | 'default', string> = {
  junior:  'bg-gradient-to-br from-brand/20 to-brand/10 text-brand ring-1 ring-brand/20',
  mid:     'bg-gradient-to-br from-plum/20 to-plum/10 text-plum ring-1 ring-plum/20',
  senior:  'bg-gradient-to-br from-mint/20 to-mint/10 text-mint ring-1 ring-mint/20',
  default: 'bg-gradient-to-br from-rule/10 to-rule/5 text-ink-2 ring-1 ring-rule/15',
};

export interface TopicGlyphProps {
  topic: Pick<Topic, 'title' | 'category' | 'level'> | null | undefined;
  size?: keyof typeof SIZES;
  className?: string;
}

/**
 * A monogram-style glyph for a topic.
 */
export function TopicGlyph({ topic, size = 'md', className }: TopicGlyphProps) {
  const title = topic?.title || topic?.category || '';
  const mark = title
    .split(/[\s/&-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('') || '?';

  const tone = TONES[topic?.level as Level] || TONES.default;

  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex shrink-0 items-center justify-center font-display font-semibold tabular-nums',
        'shadow-[inset_0_1px_0_0_rgb(255_255_255/0.15)]',
        SIZES[size],
        tone,
        className,
      )}
    >
      {mark}
    </span>
  );
}
