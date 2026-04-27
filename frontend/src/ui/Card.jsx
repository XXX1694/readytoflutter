import { forwardRef } from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '../lib/cn.js';

/**
 * Atlas Card — soft border + layered shadow + bigger radius. Variant names
 * preserved from old Codex set.
 */
const card = cva(
  ['relative transition-all duration-200 ease-out'],
  {
    variants: {
      variant: {
        // Atlas signature — soft elevation, gentle hover lift
        codex: [
          'bg-paper-2 border border-rule/10 rounded-2xl',
          'shadow-[0_1px_2px_0_rgb(var(--shadow)/0.04),0_4px_16px_-4px_rgb(var(--shadow)/0.06)]',
        ],
        // Interactive — bigger lift + hairline brand glow on hover
        codexInteractive: [
          'bg-paper-2 border border-rule/10 rounded-2xl cursor-pointer text-left',
          'shadow-[0_1px_2px_0_rgb(var(--shadow)/0.04),0_4px_16px_-4px_rgb(var(--shadow)/0.06)]',
          'hover:-translate-y-0.5 hover:border-rule/20',
          'hover:shadow-[0_2px_4px_0_rgb(var(--shadow)/0.06),0_16px_40px_-8px_rgb(var(--shadow)/0.12)]',
          'active:translate-y-0',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
        ],
        // Soft — same Atlas look but no shadow (for dense lists)
        soft: ['bg-paper-2 border border-rule/10 rounded-xl'],
        // Quiet — flat, even quieter border (for nested rows inside cards)
        quiet: ['bg-paper-2 border border-rule/8 rounded-xl'],
        // Outlined — transparent fill
        outline: ['bg-transparent border border-rule/15 rounded-xl'],
        // Glass — translucent with backdrop blur (use over aurora bg)
        glass: [
          'rounded-2xl glass',
          'shadow-[0_1px_2px_0_rgb(var(--shadow)/0.04),0_4px_16px_-4px_rgb(var(--shadow)/0.08)]',
        ],
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
