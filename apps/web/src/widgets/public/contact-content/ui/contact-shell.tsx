import * as React from 'react';
import { ShellBase, type ShellProps } from '@byte-of-me/ui';

import { cn } from '@/shared/lib/utils';

export function ContactShell({ className, ...props }: ShellProps) {
  return (
    // `max-w-5xl` is now load-bearing: the page is two columns from md up, so
    // this cap is what sets their width. It used to sit above a `max-w-md`
    // column that capped itself, which is why it looked inert.
    <ShellBase className={cn('max-w-5xl', className)} {...props} />
  );
}
