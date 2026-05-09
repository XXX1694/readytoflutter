import { cn } from '../lib/cn';

const SIZES = {
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-10 h-10 border-[3px]',
} as const;

export interface SpinnerProps {
  size?: keyof typeof SIZES;
  className?: string;
  label?: string;
}

export function Spinner({ size = 'md', className, label }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label || 'Loading'}
      className={cn(
        'inline-block animate-spin rounded-full',
        'border-rule/20 border-t-brand',
        SIZES[size],
        className,
      )}
    />
  );
}

export function FullPageLoader({ label }: { label?: string }) {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="relative flex flex-col items-center gap-4">
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
