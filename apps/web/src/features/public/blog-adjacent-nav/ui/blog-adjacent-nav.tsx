import { ArrowLeft, ArrowRight } from 'lucide-react';

import { getAdjacentPublicBlogs } from '@/entities/blog/api/get-adjacent-public-blogs';
import { Link } from '@/shared/i18n/navigation';

export async function BlogAdjacentNav({
  blogId,
  publishedDate,
  prevLabel,
  nextLabel,
}: {
  blogId: string;
  publishedDate?: Maybe<Date>;
  prevLabel: string;
  nextLabel: string;
}) {
  const resp = await getAdjacentPublicBlogs(publishedDate ?? null, blogId);
  const prev = resp.success ? resp.data.prev : null;
  const next = resp.success ? resp.data.next : null;

  if (!prev && !next) return null;

  return (
    <nav className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {prev ? (
        <Link
          href={`/blogs/${prev.slug}`}
          className="group flex flex-col gap-1 rounded-xl border p-4 transition hover:border-primary/50"
        >
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <ArrowLeft className="h-3 w-3" />
            {prevLabel}
          </span>
          <span className="line-clamp-1 font-medium transition-colors group-hover:text-primary">
            {prev.title}
          </span>
        </Link>
      ) : (
        <div className="hidden sm:block" />
      )}

      {next ? (
        <Link
          href={`/blogs/${next.slug}`}
          className="group flex flex-col items-end gap-1 rounded-xl border p-4 text-right transition hover:border-primary/50"
        >
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            {nextLabel}
            <ArrowRight className="h-3 w-3" />
          </span>
          <span className="line-clamp-1 font-medium transition-colors group-hover:text-primary">
            {next.title}
          </span>
        </Link>
      ) : (
        <div className="hidden sm:block" />
      )}
    </nav>
  );
}
