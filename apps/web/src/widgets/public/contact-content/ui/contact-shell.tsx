import * as React from 'react';
import { ShellBase, type ShellProps } from '@byte-of-me/ui';

import { cn } from '@/shared/lib/utils';

export function ContactShell({ className, ...props }: ShellProps) {
  return (
    <ShellBase
      className={cn('flex max-w-5xl flex-col gap-8', className)}
      {...props}
    />
  );
}
