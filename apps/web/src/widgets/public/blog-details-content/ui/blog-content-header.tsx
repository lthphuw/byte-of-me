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

export async function BlogContentHeader({ blog }: { blog: PublicBlog }) {
  const [locale, t] = await Promise.all([
    getLocale(),
    getTranslations('blogDetails'),
  ]);
  const author = blog.author;

  // `Blog.updatedAt`, not `BlogTranslation.updatedAt`. `updateBlog` replaces
  // the translation rows wholesale (deleteMany + createMany) on every save,
  // so a translation's timestamp is its INSERT time — identical for every
  // locale and reset even when that locale's text did not change. The blog
  // row's `@updatedAt` is the only stamp that means "this post was revised",
  // and it is already what the page's JSON-LD reports as `dateModified`.
  //
  // Compared against the date actually printed below (published, falling back
  // to created) so the two can never disagree on screen.
  const publishedOn = blog.publishedDate ?? blog.createdAt;
  const showUpdated = isMeaningfullyUpdated(publishedOn, blog.updatedAt);

  return (
    <header className="w-full">
      {blog.coverImage && (
        <div className="relative mb-8 aspect-[2/1] w-full overflow-hidden rounded-2xl border bg-muted">
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
        <div className="mb-4 flex flex-wrap gap-2">
          {blog.tags.map((tag) => (
            <Link key={tag.id} href={`/blogs?tags=${tag.slug}`}>
              <Badge variant="secondary" className="gap-1 rounded-full">
                <TagIcon className="h-3 w-3" /> {tag.name}
              </Badge>
            </Link>
          ))}
        </div>
      )}

      <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
        {blog.title}
      </h1>

      {blog.description && (
        <p className="mt-3 text-lg text-muted-foreground">{blog.description}</p>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 pb-3 text-sm">
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

        {blog.publishedDate && (
          <div className="flex items-center gap-1 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            {/* Localised, like every other date on the site (see
                `blog-card.tsx`): this was formatting to en-US on the
                Vietnamese page. */}
            {formatDate(blog.publishedDate, locale)}
          </div>
        )}

        {/* `.meta-label` — the same 11px stamp the blog grid and the project
            timeline use, so the revision date reads as metadata rather than
            as a second byline. Absent entirely when the post has not been
            revised since it went out; an "updated" equal to the published
            date is noise. */}
        {showUpdated && (
          <time
            dateTime={new Date(blog.updatedAt).toISOString()}
            className="meta-label"
          >
            {t('updatedOn', {
              date:
                formatDate(blog.updatedAt, locale, {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                }) ?? '',
            })}
          </time>
        )}

        <Separator orientation="vertical" className="hidden h-4 md:block" />

        <Suspense fallback={<BlogLiveStatsSkeleton />}>
          <BlogLiveStats blogId={blog.id} />
        </Suspense>
      </div>

      <BlogActionBar blogId={blog.id} blogSlug={blog.slug} title={blog.title} />
      <Separator className="mt-4" />
    </header>
  );
}
