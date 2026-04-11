import * as React from 'react';
import { cn } from '@/shared/lib/utils';
import { ShellBase, ShellProps } from '@/shared/ui/shell';

export function HomepageShell({ className, ...props }: ShellProps) {
  return (
    <ShellBase
      className={cn('flex max-w-3xl flex-col gap-8', className)}
      {...props}
    />
  );
}
