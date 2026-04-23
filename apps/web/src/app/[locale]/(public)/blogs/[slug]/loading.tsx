import { Card } from '@/shared/ui/card';
import { Separator } from '@/shared/ui/separator';
import { Skeleton } from '@/shared/ui/skeleton';
import { BlogDetailsShell } from '@/widgets/public/blog-details-content/ui/blog-shells';

export default function BlogDetailsLoading() {
  return (
    <BlogDetailsShell>
      <div className="flex w-full min-w-0 flex-col items-center overflow-hidden py-8 md:px-8 md:py-12">
        <div className="w-full min-w-0 max-w-3xl">
          {/* TITLE SKELETON */}
          <div className="space-y-2">
            <Skeleton className="h-10 w-full md:h-12" />
            <Skeleton className="h-10 w-2/3 md:h-12" />
          </div>

          {/* DESCRIPTION SKELETON */}
          <div className="mt-4 space-y-2">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-5/6" />
          </div>

          {/* METADATA SKELETON (Date, Reading Time) */}
          <div className="mt-6 flex items-center gap-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-24" />
          </div>

          {/* CONTENT SKELETON (Rich Text Mockup) */}
          <div className="mt-8 space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <div className="space-y-4 pt-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-full" />
            </div>
          </div>

          {/* TAGS SKELETON */}
          <div className="mt-6 flex flex-wrap gap-2">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-14 rounded-full" />
          </div>

          {/* PROJECT CARD SKELETON */}
          <div className="mt-10">
            <Separator className="my-10" />
            <Skeleton className="mb-4 h-4 w-32" /> {/* Label */}
            <Card className="overflow-hidden p-4">
              <div className="space-y-3">
                <Skeleton className="h-5 w-40" /> {/* Project Title */}
                <Skeleton className="h-3 w-full" /> {/* Project Desc line 1 */}
                <Skeleton className="h-3 w-2/3" /> {/* Project Desc line 2 */}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </BlogDetailsShell>
  );
}
