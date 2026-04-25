import { cn } from '../lib/cn.js';

const SIZES = {
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-8 h-8 border-[2.5px]',
};

export function Spinner({ size = 'md', className, label }) {
  return (
    <span
      role="status"
      aria-label={label || 'Loading'}
      className={cn(
        'inline-block animate-spin rounded-full border-rule border-t-brand',
        SIZES[size],
        className,
      )}
    />
  );
}

export function FullPageLoader({ label }) {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Spinner size="lg" label={label} />
        {label && <span className="font-mono text-xs uppercase tracking-wider text-muted">{label}</span>}
      </div>
    </div>
  );
}
