import { ExperienceShell } from '@/components/shell';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export default function ExperienceLoading() {
  return (
    <ExperienceShell>

      <Skeleton className={cn('mt-20 w-[300px] md:w-[600px] h-[350px]')} />
      <Skeleton className={cn('w-[300px] md:w-[600px] h-[350px]')} />
    </ExperienceShell>
  );
}
