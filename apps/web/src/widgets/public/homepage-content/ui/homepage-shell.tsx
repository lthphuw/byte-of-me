import * as React from 'react';
import { ShellBase, type ShellProps } from '@byte-of-me/ui';

import { cn } from '@/shared/lib/utils';

export function HomepageShell({ className, ...props }: ShellProps) {
  return (
    <ShellBase
      className={cn('max-w-3xl', className)}
      {...props}
    />
  );
}
