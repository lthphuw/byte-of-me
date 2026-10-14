import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from './lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-[color,background-color,border-color,text-decoration-color,fill,stroke,transform] motion-safe:active:scale-[0.97] motion-safe:active:duration-120 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow hover:bg-primary/90',
        destructive:
          'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
        outline:
          'border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground',
        secondary:
          'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        // Underlined at rest, not on hover: touch never hovers, and WCAG 1.4.1
        // says colour alone is not the affordance. Hover removes the underline.
        link: 'text-primary underline underline-offset-4 hover:no-underline',
      },
      // Every size is 44px on touch (`min-h-11`) and its own height with a
      // pointer (`can-hover:`). A caller's `min-h-*` still wins through `cn`.
      size: {
        default: 'h-9 min-h-11 px-4 py-2 can-hover:min-h-9',
        sm: 'h-8 min-h-11 px-3 text-xs can-hover:min-h-8',
        lg: 'h-10 min-h-11 px-8 can-hover:min-h-10',
        icon: 'h-9 w-9 min-h-11 min-w-11 can-hover:min-h-9 can-hover:min-w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        // Only a real <button> gets a type: under `asChild` the Slot forwards
        // props to a <Link>, where `type` is invalid. `{...props}` still wins.
        type={asChild ? undefined : 'button'}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
