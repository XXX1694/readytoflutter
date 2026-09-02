import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { Button } from './Button';
import { cn } from '../lib/cn';

export interface EmptyStateAction {
  label: string;
  onClick?: () => void;
  to?: string;
}

export interface EmptyStateProps {
  title: ReactNode;
  body?: ReactNode;
  action?: EmptyStateAction;
  secondary?: EmptyStateAction;
  icon?: LucideIcon;
  className?: string;
}

function ActionButton({ action, primary }: { action: EmptyStateAction; primary: boolean }) {
  const variant = primary ? 'codex' : 'outline';
  if (action.to) {
    return (
      <Button asChild variant={variant} size="sm">
        <Link to={action.to} onClick={action.onClick}>{action.label}</Link>
      </Button>
    );
  }
  return <Button variant={variant} size="sm" onClick={action.onClick}>{action.label}</Button>;
}

/**
 * Nothing here yet, said once. An empty state invites the next action
 * rather than apologising — one title, one line, at most two buttons.
 */
export function EmptyState({ title, body, action, secondary, icon: Icon, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-start gap-3 py-12 sm:items-center sm:text-center', className)}>
      {Icon && <Icon className="h-6 w-6 text-muted" strokeWidth={1.75} aria-hidden />}
      <p className="font-display text-[20px] font-semibold leading-tight text-ink">{title}</p>
      {body && <p className="max-w-md text-[15px] leading-relaxed text-muted">{body}</p>}
      {(action || secondary) && (
        <div className="mt-1 flex flex-wrap gap-2">
          {action && <ActionButton action={action} primary />}
          {secondary && <ActionButton action={secondary} primary={false} />}
        </div>
      )}
    </div>
  );
}
