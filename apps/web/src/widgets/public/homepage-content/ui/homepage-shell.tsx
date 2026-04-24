import * as React from 'react';

import { cn } from '@/shared/lib/utils';
import { ShellBase, type ShellProps } from '@/shared/ui';

export function HomepageShell({ className, ...props }: ShellProps) {
  return (
    <ShellBase
      className={cn('flex max-w-3xl flex-col gap-8', className)}
      {...props}
    />
  );
}
