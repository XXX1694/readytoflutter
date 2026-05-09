import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../lib/cn';

/**
 * Skeleton primitive — a soft pulsing block. Used to shape-prefill content
 * while data is loading, so the page doesn't pop from blank/spinner to full.
 */
export function Skeleton({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="presentation"
      aria-hidden
      className={cn('skeleton-shine rounded-sm h-4 w-full', className)}
      {...rest}
    />
  );
}

export interface SkeletonCardProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

export function SkeletonCard({ className, children, ...rest }: SkeletonCardProps) {
  return (
    <div
      className={cn(
        'rounded-md border border-rule/15 bg-paper-2/80 p-4 shadow-codex-sm',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
