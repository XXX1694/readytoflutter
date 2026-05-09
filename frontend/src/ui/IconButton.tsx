import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../lib/cn';

const SIZES = {
  sm: 'h-7 w-7',
  md: 'h-9 w-9',
  lg: 'h-11 w-11',
} as const;

const VARIANTS = {
  ghost:   'text-ink-2 hover:bg-rule/8 hover:text-ink',
  outline: 'border border-rule/15 text-ink hover:bg-rule/5 hover:border-rule/25',
  codex:   'border border-rule/15 bg-paper-2 text-ink shadow-[0_1px_2px_0_rgb(var(--shadow)/0.04)] hover:-translate-y-px hover:shadow-[0_2px_8px_-2px_rgb(var(--shadow)/0.10)]',
} as const;

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  size?: keyof typeof SIZES;
  variant?: keyof typeof VARIANTS;
  label?: string;
  children: ReactNode;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { className, size = 'md', variant = 'ghost', label, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      className={cn(
        'inline-flex items-center justify-center rounded-xl transition-all duration-200',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
        'disabled:opacity-50 disabled:pointer-events-none',
        SIZES[size],
        VARIANTS[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
});
