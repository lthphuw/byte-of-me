import { cn } from '@/shared/lib/utils';
import { Skeleton } from '@/shared/ui';
import { ExperienceShell } from '@/widgets/public/experience-content/ui/experience-shell';

export default function ExperienceLoading() {
  return (
    <ExperienceShell>
      <section className={`mx-auto flex w-full flex-col gap-10 px-4 py-12`}>
        <Skeleton className={cn('w-full h-[350px]')} />
        <Skeleton className={cn('w-full h-[350px]')} />
      </section>
    </ExperienceShell>
  );
}
