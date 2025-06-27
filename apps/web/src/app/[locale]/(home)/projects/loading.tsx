import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { ProjectsShell } from '@/components/shell';

export default function ProjectsLoading() {
  return (
    <ProjectsShell>
      <div className="container flex flex-col items-stretch mx-auto px-4 py-8">
        <Skeleton className={cn('w-full h-16')} />
        <Skeleton className={cn('mt-4 w-full h-10')} />

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 10 }, (_, index) => index + 1).map(
            (_it, index) => (
              <Skeleton
                key={index}
                className={cn(
                  'min-w-[160px] h-72 rounded-2xl border-none p-1 text-sm shadow-2xl'
                )}
              />
            )
          )}
        </div>
      </div>
    </ProjectsShell>
  );
}
