import { Suspense } from 'react';
import { Calendar } from 'lucide-react';

import type { PublicBlog } from '@/entities/blog';
import { BlogLiveStats, BlogLiveStatsSkeleton } from '@/features/public';
import { formatDate } from '@/shared/lib/utils';
import { Separator } from '@/shared/ui/separator';





export function BlogHeader({ blog }: { blog: PublicBlog }) {
  return (
    <header>
      <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
        {blog.title}
      </h1>
      {blog.description && (
        <p className="mt-3 text-lg text-muted-foreground">{blog.description}</p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-b pb-6 text-sm">
        {blog.publishedDate && (
          <div className="flex items-center gap-1 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            {formatDate(blog.publishedDate)}
          </div>
        )}

        <Separator orientation="vertical" className="hidden h-4 md:block" />

        <Suspense fallback={<BlogLiveStatsSkeleton />}>
          <BlogLiveStats blogId={blog.id} />
        </Suspense>
      </div>
    </header>
  );
}
