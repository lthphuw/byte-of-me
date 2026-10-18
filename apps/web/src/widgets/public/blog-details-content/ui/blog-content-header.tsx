import { Suspense } from 'react';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Separator,
} from '@byte-of-me/ui';
import { Calendar, TagIcon } from 'lucide-react';
import Image from 'next/image';
import { getLocale, getTranslations } from 'next-intl/server';

import type { PublicBlog } from '@/entities/blog';
import { BlogLiveStats, BlogLiveStatsSkeleton } from '@/features/public';
import { Link } from '@/shared/i18n/navigation';
import { formatDate, isMeaningfullyUpdated } from '@/shared/lib/utils';
import { BlogActionBar } from '@/widgets/public/blog-details-content/ui/blog-action-bar';

/**
 * Both dates in the header use this. The published date used to fall back to
 * `formatDate`'s month-and-year default while the revision date printed a day
 * as well, so the two disagreed about what a date looks like on the same line.
 */
const FULL_DATE: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
};

export async function BlogContentHeader({ blog }: { blog: PublicBlog }) {
  const [locale, t] = await Promise.all([
    getLocale(),
    getTranslations('blogDetails'),
  ]);
  const author = blog.author;

  // `Blog.updatedAt`, not `BlogTranslation.updatedAt`: `updateBlog` replaces translation rows
  // (deleteMany + createMany) on every save, so theirs is an INSERT time, equal across locales.
  // Compared with the printed date (published, else created) so they never disagree.
  const publishedOn = blog.publishedDate ?? blog.createdAt;
  const showUpdated = isMeaningfullyUpdated(publishedOn, blog.updatedAt);

  return (
    // One header rhythm instead of five hand-tuned margins: elements inside a block, and
    // title → subtitle (AGENTS.md §14, the public rhythm).
    <header className="w-full space-y-3 md:space-y-6">
      {blog.coverImage && (
        <div className="relative aspect-[2/1] w-full overflow-hidden rounded-2xl border bg-muted">
          <Image
            src={blog.coverImage.url}
            alt={blog.title}
            fill
            priority
            sizes="(max-width: 768px) 100vw, 768px"
            className="object-cover"
          />
        </div>
      )}

      {blog.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {blog.tags.map((tag) => (
            <Link key={tag.id} href={`/blogs?tags=${tag.slug}`}>
              <Badge variant="secondary" className="gap-1 rounded-full">
                <TagIcon className="h-3 w-3" /> {tag.name}
              </Badge>
            </Link>
          ))}
        </div>
      )}

      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          {blog.title}
        </h1>

        {blog.description && (
          <p className="text-lg text-muted-foreground">{blog.description}</p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        {author?.name && (
          <div className="flex items-center gap-2">
            <Avatar className="h-7 w-7">
              <AvatarImage src={author.avatar ?? undefined} alt={author.name} />
              <AvatarFallback>
                {author.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="font-medium text-foreground">{author.name}</span>
          </div>
        )}

        {author?.name && (
          <Separator orientation="vertical" className="hidden h-4 md:block" />
        )}

        {/* One date cluster, not two: published and revised share the icon, size and format,
            joined by a middle dot (a separate 11px `.meta-label` read as bolted on).
            Localised like every other date (see `blog-card.tsx`), not en-US. */}
        {blog.publishedDate && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Calendar className="h-4 w-4 shrink-0" />

            <span className="flex flex-wrap items-center gap-x-1.5">
              <time dateTime={new Date(blog.publishedDate).toISOString()}>
                {formatDate(blog.publishedDate, locale, FULL_DATE)}
              </time>

              {/* Absent entirely when the post has not been revised since it
                  went out — an "updated" equal to the published date is noise. */}
              {showUpdated && (
                <>
                  <span aria-hidden>·</span>
                  <time dateTime={new Date(blog.updatedAt).toISOString()}>
                    {t('updatedOn', {
                      date: formatDate(blog.updatedAt, locale, FULL_DATE) ?? '',
                    })}
                  </time>
                </>
              )}
            </span>
          </div>
        )}

        <Separator orientation="vertical" className="hidden h-4 md:block" />

        <Suspense fallback={<BlogLiveStatsSkeleton />}>
          <BlogLiveStats blogId={blog.id} />
        </Suspense>
      </div>

      <BlogActionBar blogId={blog.id} blogSlug={blog.slug} title={blog.title} />
      <Separator />
    </header>
  );
}
