import { cn } from '@/shared/lib/utils';
import { Skeleton } from '@/shared/ui/skeleton';
import { AboutShell } from '@/widgets/about-content/ui';

export default function AboutLoading() {
  return (
    <AboutShell>
      <div className="flex w-full flex-col gap-8  px-0 py-12 md:px-8">
        <Skeleton className={cn('w-full h-20')} />
        <Skeleton className={cn('w-full h-12')} />

        <Skeleton className={cn('w-[30%] h-12')} />
        <Skeleton className={cn('w-[40%] h-10')} />
        <Skeleton className={cn('w-[100%] h-64')} />

        <Skeleton className={cn('w-[30%] h-12')} />
        <Skeleton className={cn('w-[40%] h-10')} />

        <Skeleton className={cn('w-[30%] h-12')} />
        <div className={`mx-auto grid w-full grid-cols-1 gap-6 md:grid-cols-2`}>
          <Skeleton className={cn('h-64')} />
          <Skeleton className={cn('h-64')} />
          <Skeleton className={cn('h-64')} />
          <Skeleton className={cn('h-64')} />
        </div>
      </div>
    </AboutShell>
  );
}
