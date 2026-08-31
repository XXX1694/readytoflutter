import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../lib/cn';

const SIZES = {
  sm: 'h-7 w-7',
  md: 'h-9 w-9',
  lg: 'h-11 w-11',
} as const;

const VARIANTS = {
  ghost:   'text-ink-2 hover:bg-rule/8 hover:text-ink',
  outline: 'border border-rule/12 text-ink hover:border-rule/22',
  // The filled one, matching Button's primary: ink, never a coloured fill.
  codex:   'bg-ink text-paper hover:bg-ink/90 active:bg-ink/80',
} as const;

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  size?: keyof typeof SIZES;
  variant?: keyof typeof VARIANTS;
  label?: string;
  children: ReactNode;
}

/** Focus is drawn by the global `:focus-visible` rule — see Button.tsx. */
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
        'inline-flex items-center justify-center rounded-lg',
        'transition-colors duration-150',
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
