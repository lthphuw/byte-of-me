import { cn } from '@/shared/lib/utils';
import { Skeleton } from '@/shared/ui';
import { HomepageShell } from '@/widgets/public/homepage-content/ui/homepage-shell';

export default function HomeLoading() {
  return (
    <HomepageShell>
      <Skeleton className={cn('w-[50%] h-20')} />
      <Skeleton className={cn('w-[100%] h-7')} />
      <Skeleton className={cn('w-full h-[300px] md:h-[540px]')} />
      <Skeleton className={cn('w-full h-7')} />
      <Skeleton className={cn('w-[80%] h-[100px]')} />
      <Skeleton className={cn('w-[50%] h-[40px]')} />
    </HomepageShell>
  );
}
