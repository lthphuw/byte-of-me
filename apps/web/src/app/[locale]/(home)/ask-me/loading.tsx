import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { HobbiesShell } from '@/components/shell';

export default function HobbiesLoading() {
  return (
    <HobbiesShell>
      <Skeleton className={cn('size-full')} />
    </HobbiesShell>
  );
}
