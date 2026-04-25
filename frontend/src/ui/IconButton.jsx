import { forwardRef } from 'react';
import { cn } from '../lib/cn.js';

const SIZES = {
  sm: 'h-7 w-7',
  md: 'h-9 w-9',
  lg: 'h-11 w-11',
};

const VARIANTS = {
  ghost: 'text-ink-2 hover:bg-paper-2 hover:text-ink',
  outline: 'border border-rule-strong text-ink hover:bg-paper-2 hover:border-ink',
  codex: 'border-1.5 border-ink bg-paper-2 text-ink shadow-codex-sm hover:-translate-x-px hover:-translate-y-px hover:shadow-codex',
};

export const IconButton = forwardRef(function IconButton(
  { className, size = 'md', variant = 'ghost', label, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      className={cn(
        'inline-flex items-center justify-center rounded-md transition-all duration-150',
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
