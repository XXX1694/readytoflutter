import { forwardRef, type HTMLAttributes, type ElementType } from 'react';
import { cn } from '../lib/cn';
import { cardVariants, type CardVariantProps } from './variants';

export interface CardProps
  extends HTMLAttributes<HTMLElement>,
    CardVariantProps {
  as?: ElementType;
}

const Card = forwardRef<HTMLElement, CardProps>(function Card(
  { className, variant, padding, as: Comp = 'div', ...props },
  ref,
) {
  const Component = Comp as ElementType;
  return (
    <Component
      ref={ref}
      className={cn(cardVariants({ variant, padding }), className)}
      {...props}
    />
  );
});

export { Card };
