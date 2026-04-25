import { forwardRef } from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '../lib/cn.js';

const card = cva(
  ['relative transition-all duration-150'],
  {
    variants: {
      variant: {
        // Codex signature — brutalist hard-offset
        codex: [
          'bg-paper-2 border-1.5 border-ink rounded-md shadow-codex',
        ],
        // Interactive — adds hover lift and active press
        codexInteractive: [
          'bg-paper-2 border-1.5 border-ink rounded-md shadow-codex cursor-pointer text-left',
          'hover:-translate-x-px hover:-translate-y-px hover:shadow-codex-lg',
          'active:translate-x-px active:translate-y-px active:shadow-codex-sm',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
        ],
        // Soft — for dense lists where brutalism would be noisy
        soft: ['bg-paper-2 border border-rule rounded-xl shadow-soft'],
        // Quiet — flat, only divider
        quiet: ['bg-paper-2 border border-rule rounded-lg'],
        // Outlined — transparent background
        outline: ['bg-transparent border border-rule-strong rounded-lg'],
      },
      padding: {
        none: 'p-0',
        sm: 'p-3',
        md: 'p-5',
        lg: 'p-6 sm:p-8',
      },
    },
    defaultVariants: {
      variant: 'codex',
      padding: 'md',
    },
  },
);

const Card = forwardRef(function Card({ className, variant, padding, as: Comp = 'div', ...props }, ref) {
  return <Comp ref={ref} className={cn(card({ variant, padding }), className)} {...props} />;
});

export { Card, card as cardVariants };
