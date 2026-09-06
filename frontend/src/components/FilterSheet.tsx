import type { ReactNode } from 'react';
import { Drawer } from 'vaul';
import { X } from 'lucide-react';
import { tapLight } from '../lib/haptics';

/**
 * Generic bottom-sheet wrapper around `vaul`, skinned to match the paper
 * surfaces. Use it for filter / facet groups on mobile pages.
 *
 * Usage:
 *   const [open, setOpen] = useState(false);
 *   <Chip onClick={() => setOpen(true)} aria-haspopup="dialog">Filters</Chip>
 *   <FilterSheet open={open} onOpenChange={setOpen} title="Filters">
 *     ...children (the actual controls)
 *     <FilterSheet.Footer onApply={...} onClear={...} />
 *   </FilterSheet>
 *
 * The drawer auto-snaps to ~85% of the viewport but is dismissible by
 * dragging the handle, tapping the overlay, or pressing Escape.
 */
export interface FilterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /**
   * Optional sentence describing what the sheet controls. Rendered under the
   * title and wired up as the dialog's accessible description. Without it the
   * content opts out explicitly — Radix warns about a missing description
   * unless `aria-describedby` is passed as undefined.
   */
  description?: ReactNode;
  closeLabel?: string;
}

export default function FilterSheet({
  open,
  onOpenChange,
  title,
  children,
  footer = null,
  description,
  closeLabel = 'Close',
}: FilterSheetProps) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} shouldScaleBackground modal autoFocus>
      <Drawer.Portal>
        <Drawer.Overlay data-vaul-overlay className="fixed inset-0 z-50" />
        <Drawer.Content
          data-vaul-drawer
          // Radix points aria-describedby at a generated id and warns when
          // nothing owns it. With no description to render we clear the
          // attribute instead, which is the documented opt-out.
          {...(description ? {} : { 'aria-describedby': undefined })}
          className="fixed inset-x-0 bottom-0 z-50 mt-24 flex h-auto max-h-[88dvh] flex-col lg:inset-x-auto lg:left-1/2 lg:w-[520px] lg:-translate-x-1/2"
        >
          {/* Drag handle — vaul renders one too but we hide its default and
              ship our own so the visual matches the page hairlines. */}
          <span className="vaul-handle" aria-hidden />
          <div className="flex items-start justify-between gap-3 px-5 pb-2 pt-3">
            <div className="min-w-0">
              <Drawer.Title className="font-display text-lg font-semibold text-ink">
                {title}
              </Drawer.Title>
              {description && (
                <Drawer.Description className="mt-0.5 text-[13px] leading-snug text-muted">
                  {description}
                </Drawer.Description>
              )}
            </div>
            <button
              type="button"
              onClick={() => { tapLight(); onOpenChange(false); }}
              aria-label={closeLabel}
              className="touch-target pressable pressable-sm -mr-2 inline-flex shrink-0 items-center justify-center rounded-md text-muted active:text-ink"
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

export interface FilterSheetFooterProps {
  onApply?: () => void;
  onClear?: (() => void) | null;
  applyLabel?: string;
  clearLabel?: string;
}

FilterSheet.Footer = function Footer({
  onApply,
  onClear,
  applyLabel = 'Apply',
  clearLabel = 'Clear',
}: FilterSheetFooterProps) {
  return (
    <div className="flex gap-2 border-t border-rule/10 px-5 py-3">
      {onClear && (
        <button
          type="button"
          onClick={() => { tapLight(); onClear(); }}
          className="pressable flex-1 rounded-md border border-rule/15 bg-paper-2 py-3 text-[14px] font-medium text-ink-2"
        >
          {clearLabel}
        </button>
      )}
      <button
        type="button"
        onClick={() => { tapLight(); onApply?.(); }}
        className="pressable flex-[2] rounded-md bg-ink py-3 text-[14px] font-semibold text-paper"
      >
        {applyLabel}
      </button>
    </div>
  );
};
