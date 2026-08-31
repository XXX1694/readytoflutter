import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../lib/cn';

/**
 * Skeleton primitive — a flat block that holds the shape of the content still
 * loading, so the page doesn't pop from blank to full. It does not shimmer:
 * a placeholder animating for its own sake is decoration (DESIGN.md rule 5),
 * and a wall of them sweeping in sync is the loudest thing on a loading page.
 */
export function Skeleton({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="presentation"
      aria-hidden
      className={cn('h-4 w-full rounded bg-rule/8', className)}
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
      className={cn('rounded-lg border border-rule/12 bg-paper-2 p-4 shadow-codex-sm', className)}
      {...rest}
    >
      {children}
    </div>
  );
}
