import { Drawer } from 'vaul';
import { X, SlidersHorizontal } from 'lucide-react';
import { cn } from '../lib/cn.js';
import { tapLight } from '../lib/haptics.js';

/**
 * Generic bottom-sheet wrapper around `vaul`, skinned to match Atlas
 * surfaces. Use it for filter / facet groups on mobile pages.
 *
 * Usage:
 *   const [open, setOpen] = useState(false);
 *   <FilterSheetTrigger onClick={() => setOpen(true)} count={2} />
 *   <FilterSheet open={open} onOpenChange={setOpen} title="Filters">
 *     ...children (the actual controls)
 *     <FilterSheet.Footer onApply={...} onClear={...} />
 *   </FilterSheet>
 *
 * The drawer auto-snaps to ~85% of the viewport but is dismissible by
 * dragging the handle, tapping the overlay, or pressing Escape.
 */
export default function FilterSheet({ open, onOpenChange, title, children, footer = null }) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} shouldScaleBackground>
      <Drawer.Portal>
        <Drawer.Overlay data-vaul-overlay className="fixed inset-0 z-50" />
        <Drawer.Content
          data-vaul-drawer
          className="fixed inset-x-0 bottom-0 z-50 mt-24 flex h-auto max-h-[88dvh] flex-col"
        >
          {/* Drag handle — vaul renders one too but we hide its default and
              ship our own so the visual matches the Atlas hairlines. */}
          <span className="vaul-handle" aria-hidden />
          <div className="flex items-center justify-between px-5 pb-2 pt-3">
            <Drawer.Title className="font-display text-lg font-semibold text-ink">
              {title}
            </Drawer.Title>
            <button
              type="button"
              onClick={() => { tapLight(); onOpenChange(false); }}
              aria-label="Close"
              className="touch-target tap-feedback inline-flex items-center justify-center rounded-xl text-muted active:text-ink"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 pb-4">
            {children}
          </div>
          {footer}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

/**
 * Pre-styled trigger pill with optional count badge — drop into a filter row.
 */
export function FilterSheetTrigger({ onClick, count = 0, label = 'Filters', className }) {
  return (
    <button
      type="button"
      onClick={() => { tapLight(); onClick?.(); }}
      className={cn(
        'inline-flex min-h-[40px] items-center gap-2 rounded-full border border-rule/12 bg-paper-2 px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-wider text-ink-2 transition-all active:scale-95',
        className,
      )}
    >
      <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
      <span>{label}</span>
      {count > 0 && (
        <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-ink px-1.5 font-mono text-[10px] font-semibold text-paper">
          {count}
        </span>
      )}
    </button>
  );
}

FilterSheet.Footer = function Footer({ onApply, onClear, applyLabel = 'Apply', clearLabel = 'Clear' }) {
  return (
    <div className="flex gap-2 border-t border-rule/10 px-5 py-3">
      {onClear && (
        <button
          type="button"
          onClick={() => { tapLight(); onClear(); }}
          className="flex-1 rounded-xl border border-rule/15 bg-paper-2 py-3 font-display text-[14px] font-medium text-ink-2 active:scale-95 transition-transform"
        >
          {clearLabel}
        </button>
      )}
      <button
        type="button"
        onClick={() => { tapLight(); onApply?.(); }}
        className="flex-[2] rounded-xl bg-ink py-3 font-display text-[14px] font-semibold text-paper shadow-[0_4px_12px_-2px_rgb(var(--shadow)/0.18)] active:scale-95 transition-transform"
      >
        {applyLabel}
      </button>
    </div>
  );
};
