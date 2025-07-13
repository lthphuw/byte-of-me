import { CVShell } from '@/components/shell';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export default function ContactLoading() {
  return (
    <CVShell>
      <Skeleton className={cn('size-full')} />
    </CVShell>
  );
}
