import * as React from 'react';

import { cn } from '@/shared/lib/utils';

export type ShellProps = React.HTMLAttributes<HTMLDivElement>;

export function ShellBase({ children, className, ...props }: ShellProps) {
  return (
    <section
      // One rhythm for every public page; pages only choose a max-width. No inline padding: the
      // layout's `container` owns the gutter (16px phone, 32px md+). `gap-5 md:gap-8` is AGENTS.md
      // §14's "between block groups"; `pt`/`pb` are the frame, off that scale (top clears the
      // 48px phone header, and the 64px docked desktop one).
      className={cn(
        'z-20 mx-auto flex w-full flex-col gap-5 pb-8 pt-16 md:gap-8 md:pb-16 md:pt-24',
        className
      )}
      {...props}
    >
      {children}
    </section>
  );
}
