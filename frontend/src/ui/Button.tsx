import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';

/**
 * Atlas Button — Linear/Vercel-style. Soft borders, layered shadow, gentle
 * hover lift. Variant names preserved from old Codex set so existing call
 * sites don't have to change.
 */
const button = cva(
  [
    'inline-flex items-center justify-center gap-2 select-none whitespace-nowrap',
    'font-medium leading-none tracking-tight',
    'transition-all duration-200 ease-out',
    'disabled:opacity-50 disabled:pointer-events-none',
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
  ],
  {
    variants: {
      variant: {
        codex: [
          'bg-ink text-paper rounded-xl',
          'shadow-[0_1px_2px_0_rgb(var(--shadow)/0.20),0_4px_12px_-2px_rgb(var(--shadow)/0.18)]',
          'hover:-translate-y-px hover:shadow-[0_2px_4px_0_rgb(var(--shadow)/0.20),0_12px_24px_-4px_rgb(var(--shadow)/0.24)]',
          'active:translate-y-0 active:shadow-[0_1px_2px_0_rgb(var(--shadow)/0.20)]',
        ],
        brand: [
          'text-white rounded-xl',
          'bg-gradient-to-br from-brand to-brand-ink',
          'shadow-[0_1px_2px_0_rgb(var(--brand)/0.30),0_8px_24px_-6px_rgb(var(--brand)/0.40)]',
          'hover:-translate-y-px hover:shadow-[0_2px_4px_0_rgb(var(--brand)/0.40),0_16px_32px_-6px_rgb(var(--brand)/0.50)]',
          'active:translate-y-0',
        ],
        outline: [
          'bg-paper-2 text-ink rounded-xl border border-rule/15',
          'shadow-[0_1px_2px_0_rgb(var(--shadow)/0.04)]',
          'hover:bg-paper-2 hover:border-rule/30 hover:-translate-y-px',
          'active:translate-y-0',
        ],
        ghost: [
          'bg-transparent text-ink-2 rounded-xl',
          'hover:bg-rule/8 hover:text-ink',
        ],
        link: [
          'bg-transparent text-brand underline-offset-4 hover:underline rounded-sm p-0',
        ],
      },
      size: {
        xs: 'h-7 px-2.5 text-xs',
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-6 text-[15px]',
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

export type ButtonVariantProps = VariantProps<typeof button>;

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    ButtonVariantProps {
  asChild?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, asChild = false, ...props },
  ref,
) {
  if (asChild) {
    // When asChild, render as <span> so the parent (often <Link>) controls
    // the actual element. Drop button-only attrs that <span> doesn't take.
    return (
      <span
        ref={ref as unknown as React.Ref<HTMLSpanElement>}
        className={cn(button({ variant, size }), className)}
        {...(props as React.HTMLAttributes<HTMLSpanElement>)}
      />
    );
  }
  return <button ref={ref} className={cn(button({ variant, size }), className)} {...props} />;
});

export { Button, button as buttonVariants };
