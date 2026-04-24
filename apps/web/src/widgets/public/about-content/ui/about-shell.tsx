import { cn } from '@/shared/lib/utils';
import { ShellBase, type ShellProps } from '@/shared/ui';

export function AboutShell({ className, ...props }: ShellProps) {
  return <ShellBase className={cn('max-w-3xl', className)} {...props} />;
}
