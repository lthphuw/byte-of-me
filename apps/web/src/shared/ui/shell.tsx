import * as React from 'react';
import { cn } from '@/shared/lib/utils';

export type ShellProps = React.HTMLAttributes<HTMLDivElement>;

export function ShellBase({ children, className, ...props }: ShellProps) {
  return (
    <section
      className={cn(
        'mx-auto w-full pb-16 pt-20 sm:px-6 sm:pt-32 z-20',
        className
      )}
      {...props}
    >
      {children}
    </section>
  );
}
