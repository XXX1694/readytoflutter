import { cn } from '../lib/cn.js';

const ACCENTS = {
  brand: { num: 'text-brand', dot: 'bg-brand' },
  mint:  { num: 'text-mint', dot: 'bg-mint' },
  amber: { num: 'text-[rgb(var(--amber))]', dot: 'bg-[rgb(var(--amber))]' },
  ink:   { num: 'text-ink', dot: 'bg-ink' },
};

export default function StatTile({
  index,
  label,
  value,
  suffix,
  accent = 'ink',
  className,
}) {
  const a = ACCENTS[accent] || ACCENTS.ink;
  return (
    <div
      className={cn(
        'relative flex flex-col gap-3 rounded-md border-1.5 border-ink bg-paper-2 p-4 shadow-codex-sm sm:p-5',
        'transition-shadow duration-150 hover:shadow-codex',
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {index != null && (
            <span className="font-mono text-[10px] tabular-nums text-brand">
              {String(index).padStart(2, '0')}
            </span>
          )}
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
            {label}
          </span>
        </div>
        <span className={cn('h-1.5 w-1.5 rounded-full', a.dot)} aria-hidden />
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className={cn('num text-display-xs sm:text-display-sm', a.num)}>{value}</span>
        {suffix && (
          <span className="font-mono text-xs uppercase text-muted">{suffix}</span>
        )}
      </div>
    </div>
  );
}
