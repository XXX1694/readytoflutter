import { forwardRef } from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '../lib/cn.js';

const pill = cva(
  [
    'inline-flex items-center gap-1.5 font-mono uppercase tracking-wider',
    'whitespace-nowrap select-none',
  ],
  {
    variants: {
      tone: {
        neutral:  'bg-paper text-ink-2 border border-rule-strong',
        brand:    'bg-brand/10 text-brand border border-brand/30 dark:text-brand-sky',
        mint:     'bg-mint/15 text-mint border border-mint/40',
        amber:    'bg-amber/15 text-[rgb(var(--amber))] border border-amber/40',
        coral:    'bg-coral/15 text-[rgb(var(--coral))] border border-coral/40',
        plum:     'bg-plum/15 text-plum border border-plum/40',
        ink:      'bg-ink text-paper border border-ink',
        ghost:    'bg-transparent text-muted border border-rule',
      },
      size: {
        xs: 'h-5 px-1.5 text-[10px]',
        sm: 'h-6 px-2 text-[11px]',
        md: 'h-7 px-2.5 text-xs',
      },
      shape: {
        square: 'rounded-sm',
        rounded: 'rounded-md',
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
