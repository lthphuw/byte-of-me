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
      // `gap-6 md:gap-8` is the "between block groups" role from the public
      // rhythm in AGENTS.md §14 — a flat gap would make a page's top-level
      // children the one level that did not open up on a wide screen while
      // everything nested inside them did.
      //
      // `pt`/`pb` are deliberately NOT on that scale: they are the frame around
      // the content rather than rhythm within it. The top clears the floating
      // header (80px on a phone, 112px from `md`), the bottom is 48 → 64.
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
