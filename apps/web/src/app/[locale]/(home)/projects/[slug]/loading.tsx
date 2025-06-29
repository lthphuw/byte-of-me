import { Skeleton } from '@/components/ui/skeleton';
import { ProjectDetailsShell } from '@/components/shell';

export default function ProjectDetailsLoading() {
  return (
    <ProjectDetailsShell>
      <div className="w-full max-w-3xl mx-auto py-10 px-4 space-y-6">
        {/* Title */}
        <Skeleton className="h-8 w-2/3 rounded" />

        {/* Image block */}
        <Skeleton className="h-64 w-full rounded-xl mt-6" />

        {/* Paragraphs */}
        <div className="space-y-3">
          <Skeleton className="h-4 w-full rounded" />
          <Skeleton className="h-4 w-11/12 rounded" />
          <Skeleton className="h-4 w-10/12 rounded" />
        </div>

        {/* Sub-heading */}
        <Skeleton className="h-6 w-1/3 rounded mt-6" />

        {/* Another paragraph */}
        <div className="space-y-3">
          <Skeleton className="h-4 w-full rounded" />
          <Skeleton className="h-4 w-5/6 rounded" />
          <Skeleton className="h-4 w-4/6 rounded" />
        </div>

        {/* Fake code block */}
        <div className="p-4 rounded-lg space-y-2">
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    </ProjectDetailsShell>
  );
}
