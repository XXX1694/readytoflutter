import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { MoreHorizontal, type LucideIcon } from 'lucide-react';
import { cn } from '../lib/cn';

export interface OverflowMenuItem {
  label: string;
  icon?: LucideIcon;
  onSelect: () => void;
  /** Set on destructive items; the row reads in coral. */
  danger?: boolean;
}

export interface OverflowMenuProps {
  /** Accessible name for the trigger, e.g. "More actions". */
  label: string;
  items: OverflowMenuItem[];
  align?: 'start' | 'end';
  className?: string;
}

/**
 * The "⋯" that holds a screen's secondary actions so the header can carry
 * one primary button. Radix handles focus, typeahead and Escape.
 */
export function OverflowMenu({ label, items, align = 'end', className }: OverflowMenuProps) {
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={label}
          title={label}
          className={cn(
            'inline-flex h-10 w-10 items-center justify-center rounded-lg border border-rule/12 bg-paper-2 text-ink-2 transition-colors hover:border-rule/25 hover:text-ink',
            className,
          )}
        >
          <MoreHorizontal className="h-4 w-4" aria-hidden />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align={align}
          sideOffset={6}
          className="z-50 min-w-[200px] rounded-lg border border-rule/12 bg-paper-2 p-1 shadow-codex-lg"
        >
          {items.map((item) => (
            <DropdownMenu.Item
              key={item.label}
              onSelect={item.onSelect}
              className={cn(
                'flex cursor-pointer select-none items-center gap-2.5 rounded-md px-2.5 py-2 text-[13.5px] outline-none',
                'data-[highlighted]:bg-rule/8',
                item.danger ? 'text-coral' : 'text-ink',
              )}
            >
              {item.icon && <item.icon className="h-4 w-4 text-muted" aria-hidden />}
              {item.label}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
