import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import type { User } from '../types/domain';

const initialsOf = (user: User | null): string => {
  const source = user?.name?.trim() || user?.email || '?';
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  if (source.includes('@')) return source[0].toUpperCase();
  return source.slice(0, 2).toUpperCase();
};

export interface AccountTriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  user: User | null;
}

/**
 * The avatar button in the header. Rendered twice on purpose: eagerly by
 * AccountMenu as a stand-in, and by the lazily loaded AccountDropdown as the
 * real Radix trigger — same markup, so the swap is invisible.
 */
const AccountTrigger = forwardRef<HTMLButtonElement, AccountTriggerProps>(function AccountTrigger(
  { user, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      className="inline-flex h-9 items-center gap-1.5 rounded-md border border-rule/12 pl-1 pr-1.5 transition-colors hover:border-rule/24"
      {...props}
    >
      <span className="inline-flex h-7 w-7 items-center justify-center rounded bg-brand text-[11px] font-semibold text-on-brand">
        {initialsOf(user)}
      </span>
      <ChevronDown className="hidden h-3 w-3 text-muted sm:block" aria-hidden />
    </button>
  );
});

export default AccountTrigger;
