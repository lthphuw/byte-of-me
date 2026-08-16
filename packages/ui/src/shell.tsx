import * as React from 'react';

import { cn } from './lib/utils';

export type ShellProps = React.HTMLAttributes<HTMLDivElement>;

export function ShellBase({ children, className, ...props }: ShellProps) {
  return (
    <section
      // One rhythm for every public page: top/bottom padding and section gap
      // live here; per-page shells only choose a max-width. No inline padding —
      // the layout's `container` already owns the 32px gutter, and doubling it
      // here (the old `sm:px-6`) pushed page text 24px off the header column.
      //
      // `gap-8 md:gap-12` is the "between block groups" role from the public
      // rhythm in AGENTS.md §14 — it was a flat `gap-8`, which made a page's
      // top-level children the one level that did not open up on a wide screen
      // while everything nested inside them did.
      //
      // `pt`/`pb` are deliberately NOT on that scale: they are the frame around
      // the content rather than rhythm within it.
      className={cn(
        'z-20 mx-auto flex w-full flex-col gap-8 pb-16 pt-20 sm:pt-32 md:gap-12',
        className
      )}
      {...props}
    >
      {children}
    </section>
  );
}
