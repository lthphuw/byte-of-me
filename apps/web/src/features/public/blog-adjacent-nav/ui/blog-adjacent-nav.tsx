import { ArrowLeft, ArrowRight } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { getAdjacentPublicBlogs } from '@/entities/blog/api/get-adjacent-public-blogs';
import { Link } from '@/shared/i18n/navigation';
import { SectionLoadError } from '@/shared/ui';

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
  const [resp, tError] = await Promise.all([
    getAdjacentPublicBlogs(publishedDate ?? null, blogId),
    getTranslations('components.sectionLoadError'),
  ]);
  if (!resp.success) {
    return (
      <SectionLoadError
        title={tError('title')}
        description={tError('description')}
      />
    );
  }
  const prev = resp.data.prev;
  const next = resp.data.next;

  // Both missing is a successful read with no neighbour, not a failure.
  if (!prev && !next) return null;

  return (
    <nav className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:gap-10">
      {prev ? (
        <Link
          href={`/blogs/${prev.slug}`}
          className="group flex flex-col gap-2 rounded-xl border p-4 transition-[transform,border-color,box-shadow] duration-200 ease-enter hover:border-primary/50 hover:shadow-md motion-safe:hover:-translate-y-0.5"
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
          className="group flex flex-col items-end gap-2 rounded-xl border p-4 text-right transition-[transform,border-color,box-shadow] duration-200 ease-enter hover:border-primary/50 hover:shadow-md motion-safe:hover:-translate-y-0.5"
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
