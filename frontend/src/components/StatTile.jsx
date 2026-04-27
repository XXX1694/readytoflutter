import { cn } from '../lib/cn.js';

const ACCENTS = {
  brand: { num: 'text-brand',                  dot: 'bg-brand',                  glow: 'from-brand/[0.06] to-transparent' },
  mint:  { num: 'text-mint',                   dot: 'bg-mint',                   glow: 'from-mint/[0.06] to-transparent' },
  amber: { num: 'text-[rgb(var(--amber))]',    dot: 'bg-[rgb(var(--amber))]',    glow: 'from-amber/[0.06] to-transparent' },
  ink:   { num: 'text-ink',                    dot: 'bg-ink-2',                  glow: 'from-ink/[0.04] to-transparent' },
};

export default function StatTile({
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
        'group relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-rule/8 bg-paper-2 p-5 sm:p-6',
        'shadow-[0_1px_2px_0_rgb(var(--shadow)/0.04),0_4px_16px_-4px_rgb(var(--shadow)/0.06)]',
        'transition-all duration-300 ease-out',
        'hover:-translate-y-0.5 hover:border-rule/15',
        'hover:shadow-[0_2px_4px_0_rgb(var(--shadow)/0.06),0_16px_40px_-8px_rgb(var(--shadow)/0.10)]',
        className,
      )}
    >
      {/* Soft accent wash — pulled from the tile's accent colour */}
      <span aria-hidden className={cn('pointer-events-none absolute inset-0 -z-0 bg-gradient-to-br opacity-0 transition-opacity duration-500 group-hover:opacity-100', a.glow)} />

      <div className="relative flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
          {label}
        </span>
        <span className={cn('h-1.5 w-1.5 rounded-full', a.dot)} aria-hidden />
      </div>
      <div className="relative flex items-baseline gap-1.5">
        <span className={cn('num text-display-xs sm:text-display-sm', a.num)}>{value}</span>
        {suffix && (
          <span className="font-mono text-xs uppercase text-muted">{suffix}</span>
        )}
      </div>
    </div>
  );
}
