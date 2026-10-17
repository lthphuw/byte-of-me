import * as React from 'react';

import { cn } from '@/shared/lib/utils';
import { ShellBase, type ShellProps } from '@/shared/ui/shell';

export function BlogDetailsShell({ className, ...props }: ShellProps) {
  return (
    <ShellBase
      // Wide enough to hold a 720px reading column with a real table-of-contents
      // rail beside it, instead of squeezing the rail against the viewport edge.
      className={cn('max-w-[1240px]', className)}
      {...props}
    />
  );
}
