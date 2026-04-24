import * as React from 'react';

import { cn } from '@/shared/lib/utils';
import { ShellBase, type ShellProps } from '@/shared/ui';

export function ContactShell({ className, ...props }: ShellProps) {
  return (
    <ShellBase
      className={cn('flex max-w-5xl flex-col gap-8', className)}
      {...props}
    />
  );
}
