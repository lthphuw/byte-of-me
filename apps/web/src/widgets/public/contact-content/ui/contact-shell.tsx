import * as React from 'react';
import { ShellBase, type ShellProps } from '@byte-of-me/ui';

import { cn } from '@/shared/lib/utils';

export function ContactShell({ className, ...props }: ShellProps) {
  return (
    // No max-width: the contact column is capped at `max-w-md` by the content
    // itself, so a wider cap here only looked like it was doing something.
    <ShellBase className={cn('max-w-5xl', className)} {...props} />
  );
}
