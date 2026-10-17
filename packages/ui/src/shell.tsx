import * as React from 'react';
import { cn } from '@byte-of-me/ui-utils';

export type ShellProps = React.HTMLAttributes<HTMLDivElement>;

export function ShellBase({ children, className, ...props }: ShellProps) {
  return (
    <section
      // One rhythm for every public page; pages only choose a max-width. No inline padding: the
      // layout's `container` owns the 32px gutter. `gap-6 md:gap-8` is AGENTS.md §14's "between
      // block groups"; `pt`/`pb` are the frame, off that scale (top clears the 80/112px header).
      className={cn(
        'z-20 mx-auto flex w-full flex-col gap-6 pb-12 pt-20 md:gap-8 md:pb-16 md:pt-28',
        className
      )}
      {...props}
    >
      {children}
    </section>
  );
}
