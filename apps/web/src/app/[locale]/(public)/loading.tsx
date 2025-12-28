import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { HomeShell } from '@/components/shell';

export default function HomeLoading() {
  return (
    <HomeShell>
      <Skeleton className={cn('w-[50%] h-20')} />
      <Skeleton className={cn('w-[100%] h-7')} />
      <Skeleton className={cn('w-full h-[300px] md:h-[540px]')} />
      <Skeleton className={cn('w-full h-7')} />
      <Skeleton className={cn('w-[80%] h-[100px]')} />
      <Skeleton className={cn('w-[50%] h-[40px]')} />
    </HomeShell>
  );
}
