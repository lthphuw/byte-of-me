import { cn } from '@/shared/lib/utils';
import type { ShellProps } from '@/shared/ui/shell';
import { ShellBase } from '@/shared/ui/shell';

export function AboutShell({ className, ...props }: ShellProps) {
  return <ShellBase className={cn('max-w-3xl', className)} {...props} />;
}
