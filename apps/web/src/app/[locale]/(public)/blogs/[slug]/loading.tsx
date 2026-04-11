import { Card } from '@/shared/ui/card';
import { Separator } from '@/shared/ui/separator';
import { Skeleton } from '@/shared/ui/skeleton';
import { BlogDetailsShell } from '@/widgets/blog-details/ui/blog-shells';

export default function BlogDetailsLoading() {
  return (
    <BlogDetailsShell>
      <div className="flex flex-col items-center w-full md:px-8 py-8 md:py-12 min-w-0 overflow-hidden">
        <div className="w-full max-w-3xl min-w-0">
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
          <div className="flex items-center gap-4 mt-6">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-24" />
          </div>

          {/* TAGS SKELETON */}
          <div className="flex flex-wrap gap-2 mt-6">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-14 rounded-full" />
          </div>

          {/* COVER IMAGE SKELETON */}
          <div className="mt-8 mb-10">
            <Skeleton className="w-full aspect-video rounded-xl" />
          </div>

          {/* CONTENT SKELETON (Rich Text Mockup) */}
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <div className="pt-4 space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-full" />
            </div>
          </div>

          {/* PROJECT CARD SKELETON */}
          <div className="mt-10">
            <Separator className="my-10" />
            <Skeleton className="h-4 w-32 mb-4" /> {/* Label */}
            <Card className="p-4 overflow-hidden">
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
