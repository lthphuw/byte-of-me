import { Skeleton } from '@byte-of-me/ui';

import { BlogCardSkeleton } from '@/entities/blog';
import { BlogsShell } from '@/widgets/public/blogs-content/ui';

/**
 * Route-level fallback for /blogs: mirrors `BlogsContent` while loading (`ListPageHeader` over a
 * two-column grid, never three, of `BlogCardSkeleton`s), reusing that skeleton so they cannot drift.
 * No container or padding of its own: `BlogsShell` owns the page frame.
 */
export default function BlogsLoading() {
  return (
    <BlogsShell>
      {/* Mirrors ListPageHeader: title/subtitle pair, then the filter row,
          over a rule. */}
      <div className="flex flex-col gap-4 border-b border-border/60 pb-5 md:gap-6 md:pb-6">
        {/* Title over the count line. There is no description strapline, so
            the second bar stands in for "12 posts", not a sentence. */}
        <div className="space-y-2">
          <Skeleton className="h-9 w-56 md:h-12 md:w-72" />
          <Skeleton className="h-5 w-24 md:h-6 md:w-28" />
        </div>
        <Skeleton className="h-8 w-full sm:max-w-xs" />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-8">
        {Array.from({ length: 4 }).map((_, index) => (
          <BlogCardSkeleton key={index} />
        ))}
      </div>
    </BlogsShell>
  );
}
