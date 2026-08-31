import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '../lib/cn';
import { pillVariants, type PillVariantProps } from './variants';

export interface PillProps
  extends HTMLAttributes<HTMLSpanElement>,
    PillVariantProps {}

const Pill = forwardRef<HTMLSpanElement, PillProps>(function Pill(
  { className, tone, size, shape, ...props },
  ref,
) {
  return <span ref={ref} className={cn(pillVariants({ tone, size, shape }), className)} {...props} />;
});

export { Pill };
