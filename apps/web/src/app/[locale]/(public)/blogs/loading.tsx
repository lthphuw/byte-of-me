import { Skeleton } from '@byte-of-me/ui';

import { BlogCardSkeleton } from '@/entities/blog';
import { BlogsShell } from '@/widgets/public/blogs-content/ui';

/**
 * Route-level fallback for /blogs.
 *
 * Mirrors what `BlogsContent` renders while its query is in flight — a
 * `ListPageHeader` above a `grid-cols-1 md:grid-cols-2` of `BlogCardSkeleton`s
 * — and reuses that skeleton component rather than approximating it with a
 * bare box, so the two cannot drift apart.
 *
 * It previously rendered generic `h-72` blocks in a `lg:grid-cols-3` grid; the
 * real list is two columns and never three, so the third column collapsed away
 * on load.
 *
 * No container or padding of its own — `BlogsShell` (`ShellBase`) already owns
 * the page frame and the gap between these children.
 */
export default function BlogsLoading() {
  return (
    <BlogsShell>
      {/* Mirrors ListPageHeader: title/subtitle pair, then the filter row,
          over a rule. */}
      <div className="flex flex-col gap-4 border-b border-border/60 pb-5 md:gap-6 md:pb-6">
        <div className="space-y-2">
          <Skeleton className="h-9 w-56 md:h-12 md:w-72" />
          <Skeleton className="h-5 w-72 md:h-6 md:w-96" />
        </div>
        <Skeleton className="h-11 w-full sm:max-w-xs md:h-9" />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-10">
        {Array.from({ length: 4 }).map((_, index) => (
          <BlogCardSkeleton key={index} />
        ))}
      </div>
    </BlogsShell>
  );
}
