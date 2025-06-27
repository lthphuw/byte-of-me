import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { ExperienceShell } from '@/components/shell';

export default function ExperienceLoading() {
  return (
    <ExperienceShell>
      <Skeleton className={cn('size-full')} />
    </ExperienceShell>
  );
}
