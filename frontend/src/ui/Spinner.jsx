import { cn } from '../lib/cn.js';

const SIZES = {
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-10 h-10 border-[3px]',
};

/**
 * Atlas Spinner — gradient brand→sky ring with conic-style spin. Cleaner
 * than the default solid-on-track look.
 */
export function Spinner({ size = 'md', className, label }) {
  return (
    <span
      role="status"
      aria-label={label || 'Loading'}
      className={cn(
        'inline-block animate-spin rounded-full',
        // Track at /20 so it's actually visible against light surfaces; the
        // brand-colored top edge is what readers track for the spin.
        'border-rule/20 border-t-brand',
        SIZES[size],
        className,
      )}
    />
  );
}

export function FullPageLoader({ label }) {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="relative flex flex-col items-center gap-4">
        {/* Aurora glow halo behind spinner */}
        <span aria-hidden className="absolute inset-0 -z-10 m-auto h-24 w-24 rounded-full bg-gradient-to-br from-brand/20 to-brand-sky/10 blur-2xl" />
        <Spinner size="lg" label={label} />
        {label && (
          <span className="font-mono text-xs uppercase tracking-[0.18em] text-muted">
            {label}
          </span>
        )}
      </div>
    </div>
  );
}
