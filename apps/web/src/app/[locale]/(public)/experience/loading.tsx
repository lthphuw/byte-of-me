import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { ExperienceShell } from '@/components/shell';

export default function ExperienceLoading() {
  return (
    <ExperienceShell>
      <section className={`mx-auto w-full px-4 py-12 flex flex-col gap-10`}>
        <Skeleton className={cn('w-full h-[350px]')} />
        <Skeleton className={cn('w-full h-[350px]')} />
      </section>
    </ExperienceShell>
  );
}
