import { cn } from '../lib/cn.js';

const SIZES = {
  sm: 'h-7 w-7 text-[11px] rounded-lg',
  md: 'h-10 w-10 text-sm rounded-xl',
  lg: 'h-14 w-14 text-2xl rounded-2xl',
};

// Atlas: gradient-tinted glyph instead of border + flat fill — more premium feel.
const TONES = {
  junior:  'bg-gradient-to-br from-brand/15 to-brand/5 text-brand ring-1 ring-brand/20',
  mid:     'bg-gradient-to-br from-plum/15 to-plum/5 text-plum ring-1 ring-plum/20',
  senior:  'bg-gradient-to-br from-mint/15 to-mint/5 text-mint ring-1 ring-mint/20',
  default: 'bg-gradient-to-br from-rule/8 to-transparent text-ink-2 ring-1 ring-rule/15',
};

/**
 * A monogram-style glyph for a topic. Atlas: gradient tint + ring instead of
 * a hard border, sits softer against the new aurora background.
 */
export function TopicGlyph({ topic, size = 'md', className }) {
  const title = topic?.title || topic?.category || '';
  const mark = title
    .split(/[\s/&-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('') || '?';

  const tone = TONES[topic?.level] || TONES.default;

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
