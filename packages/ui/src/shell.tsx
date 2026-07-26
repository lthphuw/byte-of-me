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
      className={cn(
        'z-20 mx-auto flex w-full flex-col gap-8 pb-16 pt-20 sm:pt-32',
        className
      )}
      {...props}
    >
      {children}
    </section>
  );
}
