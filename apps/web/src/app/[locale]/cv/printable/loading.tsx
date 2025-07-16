import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { CVShell } from '@/components/shell';

export default function ContactLoading() {
  return (
    <CVShell>
      <Skeleton className={cn('size-full')} />
    </CVShell>
  );
}
