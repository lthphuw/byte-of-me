import * as React from 'react';
import { cn } from '@byte-of-me/ui-utils';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

// `interactive` is set by `asChild`: a badge that is a button or a link needs a
// hover state and a focus ring, and a static label must not look clickable.
const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground shadow',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground shadow',
        outline: 'text-foreground',
      },
      interactive: {
        true: 'cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        false: '',
      },
    },
    compoundVariants: [
      {
        variant: 'default',
        interactive: true,
        className: 'hover:bg-primary/80',
      },
      {
        variant: 'secondary',
        interactive: true,
        className: 'hover:bg-secondary/80',
      },
      {
        variant: 'destructive',
        interactive: true,
        className: 'hover:bg-destructive/80',
      },
      {
        variant: 'outline',
        interactive: true,
        className: 'hover:bg-accent hover:text-accent-foreground',
      },
    ],
    defaultVariants: {
      variant: 'default',
      interactive: false,
    },
  }
);

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.HTMLAttributes<HTMLElement> &
  Pick<VariantProps<typeof badgeVariants>, 'variant'> & {
    /** Style the child (a `<button>` or `<a>`) as an interactive badge. */
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : 'div';
  return (
    <Comp
      className={cn(
        badgeVariants({ variant, interactive: asChild }),
        className
      )}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
