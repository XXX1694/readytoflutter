import { forwardRef } from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '../lib/cn.js';

const button = cva(
  [
    'inline-flex items-center justify-center gap-2 select-none whitespace-nowrap',
    'font-medium leading-none transition-all duration-150',
    'disabled:opacity-50 disabled:pointer-events-none',
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
  ],
  {
    variants: {
      variant: {
        // Brutalist signature — hard offset shadow, ink border, paper fill
        codex: [
          'bg-paper-2 text-ink border-1.5 border-ink rounded-md shadow-codex',
          'hover:-translate-x-px hover:-translate-y-px hover:shadow-codex-lg',
          'active:translate-x-px active:translate-y-px active:shadow-codex-sm',
        ],
        // Brand-filled variant of codex
        brand: [
          'bg-brand text-white border-1.5 border-ink rounded-md shadow-codex',
          'hover:-translate-x-px hover:-translate-y-px hover:shadow-codex-lg',
          'active:translate-x-px active:translate-y-px active:shadow-codex-sm',
        ],
        // Minimal — for navigation, dense controls
        ghost: [
          'bg-transparent text-ink-2 rounded-md',
          'hover:bg-paper-2 hover:text-ink',
        ],
        // Outline soft — quiet secondary
        outline: [
          'bg-transparent text-ink border border-rule-strong rounded-md',
          'hover:bg-paper-2 hover:border-ink',
        ],
        // Link-style
        link: [
          'bg-transparent text-brand underline-offset-4 hover:underline rounded-sm p-0',
        ],
      },
      size: {
        xs: 'h-7 px-2.5 text-xs',
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-6 text-base',
        icon: 'h-9 w-9 p-0',
        'icon-sm': 'h-7 w-7 p-0',
      },
    },
    defaultVariants: {
      variant: 'codex',
      size: 'md',
    },
  },
);

const Button = forwardRef(function Button(
  { className, variant, size, asChild = false, ...props },
  ref,
) {
  const Comp = asChild ? 'span' : 'button';
  return <Comp ref={ref} className={cn(button({ variant, size }), className)} {...props} />;
});

export { Button, button as buttonVariants };
