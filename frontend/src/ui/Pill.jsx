import { forwardRef } from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '../lib/cn.js';

/**
 * Atlas Pill — soft tinted background, no border by default. Replaces the
 * brutalist border-heavy version. Tones map to the same names so existing
 * call sites don't change.
 */
const pill = cva(
  [
    'inline-flex items-center gap-1 font-mono uppercase tracking-wider',
    'whitespace-nowrap select-none',
    'transition-colors duration-150',
  ],
  {
    variants: {
      tone: {
        neutral:  'bg-rule/8 text-ink-2',
        brand:    'bg-brand/12 text-brand',
        mint:     'bg-mint/12 text-mint',
        amber:    'bg-amber/15 text-[rgb(var(--amber))]',
        coral:    'bg-coral/15 text-coral',
        plum:     'bg-plum/15 text-plum',
        ink:      'bg-ink text-paper',
        ghost:    'bg-transparent text-muted ring-1 ring-rule/15',
      },
      size: {
        xs: 'h-5 px-1.5 text-[10px]',
        sm: 'h-6 px-2 text-[11px]',
        md: 'h-7 px-2.5 text-xs',
      },
      shape: {
        square: 'rounded-md',
        rounded: 'rounded-full',
        full: 'rounded-full',
      },
    },
    defaultVariants: {
      tone: 'neutral',
      size: 'sm',
      shape: 'rounded',
    },
  },
);

const Pill = forwardRef(function Pill({ className, tone, size, shape, ...props }, ref) {
  return <span ref={ref} className={cn(pill({ tone, size, shape }), className)} {...props} />;
});

// Convenience helpers — semantic mapping for level + difficulty
export const levelTone = {
  junior: 'brand',
  mid: 'plum',
  senior: 'ink',
};

export const difficultyTone = {
  easy: 'mint',
  medium: 'amber',
  hard: 'coral',
};

export const statusTone = {
  not_started: 'ghost',
  in_progress: 'amber',
  completed: 'mint',
};

export { Pill, pill as pillVariants };
