import * as React from 'react';

import { cn } from '@/shared/lib/utils';
import { ShellBase, type ShellProps } from '@/shared/ui/shell';

export function HomepageShell({ className, ...props }: ShellProps) {
  return <ShellBase className={cn('max-w-3xl', className)} {...props} />;
}
