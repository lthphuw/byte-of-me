import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { AskMeShell } from '@/components/shell';

export default function AskMeLoading() {
  return (
    <AskMeShell>
      <Skeleton className={cn('size-full')} />
    </AskMeShell>
  );
}
