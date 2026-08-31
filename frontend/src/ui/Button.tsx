import {
  forwardRef,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type Ref,
} from 'react';
import { cn } from '../lib/cn';
import { buttonVariants, type ButtonVariantProps } from './variants';

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    ButtonVariantProps {
  asChild?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, asChild = false, ...props },
  ref,
) {
  if (asChild) {
    // When asChild, render as <span> so the parent (often <Link>) controls
    // the actual element. Drop button-only attrs that <span> doesn't take.
    return (
      <span
        ref={ref as unknown as Ref<HTMLSpanElement>}
        className={cn(buttonVariants({ variant, size }), className)}
        {...(props as HTMLAttributes<HTMLSpanElement>)}
      />
    );
  }
  return (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  );
});

export { Button };
