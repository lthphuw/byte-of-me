import { Card , Separator , Skeleton } from '@byte-of-me/ui';

import { BlogDetailsShell } from '@/widgets/public/blog-details-content/ui/blog-shells';

export default function BlogDetailsLoading() {
  return (
    <BlogDetailsShell>
      <div className="flex w-full min-w-0 flex-col items-center overflow-hidden py-8 md:px-8 md:py-12">
        {/* Matches the article's reading measure so nothing shifts on load. */}
        <div className="w-full min-w-0 max-w-[720px]">
          {/*
            The groups below mirror `BlogContentHeader`, which stacks its
            children at the `space-y-4 md:space-y-6` rhythm role with the
            title/description pair grouped at `space-y-2`. The `space-y-2`
            *inside* each group is line simulation, not rhythm — those bars
            stand in for wrapped lines of a single heading or paragraph, so
            they deliberately stay off the rhythm scale.
          */}
          <div className="space-y-4 md:space-y-6">
            {/* TITLE SKELETON */}
            <div className="space-y-2">
              <Skeleton className="h-10 w-full md:h-12" />
              <Skeleton className="h-10 w-2/3 md:h-12" />
            </div>

            {/* DESCRIPTION SKELETON */}
            <div className="space-y-2">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-5/6" />
            </div>

            {/* METADATA SKELETON (Date, Reading Time) */}
            <div className="flex items-center gap-x-4 gap-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-24" />
            </div>

            {/* TAGS SKELETON */}
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-14 rounded-full" />
            </div>
          </div>

          {/* Header → article: the same step the real page uses. */}
          <div className="mb-8 md:mb-12" />

          {/* CONTENT SKELETON (Rich Text Mockup) */}
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <div className="space-y-4 pt-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-full" />
            </div>
          </div>

          {/* PROJECT CARD SKELETON */}
          <div>
            <Separator className="my-8 md:my-12" />
            <Skeleton className="mb-2 h-4 w-32" /> {/* Label */}
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
