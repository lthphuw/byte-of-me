import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { AboutShell } from '@/components/shell';

export default function AboutLoading() {
  return (
    <AboutShell>
      <Skeleton className={cn('w-full h-20')} />
      <Skeleton className={cn('w-full h-12')} />

      <Skeleton className={cn('w-[30%] h-12')} />
      <Skeleton className={cn('w-[40%] h-10')} />
      <Skeleton className={cn('w-[100%] h-64')} />

      <Skeleton className={cn('w-[30%] h-12')} />
      <Skeleton className={cn('w-[40%] h-10')} />

      <Skeleton className={cn('w-[30%] h-12')} />
      <div className={`w-full mx-auto grid gap-6 grid-cols-1 md:grid-cols-2`}>
        <Skeleton className={cn('h-64')} />
        <Skeleton className={cn('h-64')} />
        <Skeleton className={cn('h-64')} />
        <Skeleton className={cn('h-64')} />
      </div>
    </AboutShell>
  );
}
