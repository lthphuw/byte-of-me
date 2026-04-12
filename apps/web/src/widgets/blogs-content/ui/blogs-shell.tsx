import * as React from 'react';

import { cn } from '@/shared/lib/utils';
import type { ShellProps } from '@/shared/ui/shell';
import { ShellBase } from '@/shared/ui/shell';

export function BlogsShell({ className, ...props }: ShellProps) {
  return (
    <ShellBase
      className={cn('flex max-w-5xl flex-col gap-8', className)}
      {...props}
    />
  );
}
