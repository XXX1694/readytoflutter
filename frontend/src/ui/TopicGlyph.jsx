import { cn } from '../lib/cn.js';

const SIZES = {
  sm: 'h-6 w-6 text-[11px]',
  md: 'h-9 w-9 text-sm',
  lg: 'h-14 w-14 text-2xl',
};

const TONES = {
  junior: 'bg-brand/12 text-brand border-brand/30',
  mid:    'bg-plum/12 text-plum border-plum/30',
  senior: 'bg-mint/12 text-mint border-mint/30',
  default:'bg-paper text-ink border-rule-strong',
};

/**
 * A monogram-style glyph for a topic. Replaces the old emoji slot — pulls a
 * 1–2 character mark from the title and frames it in a small box that picks
 * up the topic's level color. Falls back to the topic's category initial.
 */
export function TopicGlyph({ topic, size = 'md', className }) {
  const title = topic?.title || topic?.category || '';
  // Monogram: first letter of first two title words, capped at 2 chars
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
        'inline-flex shrink-0 items-center justify-center rounded-md border-1.5 font-mono font-medium tabular-nums',
        SIZES[size],
        tone,
        className,
      )}
    >
      {mark}
    </span>
  );
}
