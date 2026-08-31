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

/** A ring of hairline with one ink arc. The rotation is the whole signal. */
export function Spinner({ size = 'md', className, label }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label || 'Loading'}
      className={cn(
        'inline-block animate-spin rounded-full',
        'border-rule/14 border-t-ink',
        SIZES[size],
        className,
      )}
    />
  );
}

export interface FullPageLoaderProps {
  label?: string;
}

export function FullPageLoader({ label }: FullPageLoaderProps) {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Spinner size="lg" label={label} />
        {label && <span className="text-[13px] text-muted">{label}</span>}
      </div>
    </div>
  );
}
