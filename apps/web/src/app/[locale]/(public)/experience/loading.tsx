import { cn } from '@/shared/lib/utils';
import { Skeleton } from '@/shared/ui/skeleton';
import { ExperienceShell } from '@/widgets/experience-content/ui/experience-shell';

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
