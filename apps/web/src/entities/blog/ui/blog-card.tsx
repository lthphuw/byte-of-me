'use client';

import { Badge } from '@byte-of-me/ui';
import { Layers } from 'lucide-react';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';

import type { PublicBlog } from '@/entities/blog/model/types';
import { Link } from '@/shared/i18n/navigation';
import { formatDate } from '@/shared/lib/utils';

interface BlogCardProps {
  blog: PublicBlog;
  onTagClick?: (slug: string) => void;
}

export function BlogCard({ blog, onTagClick }: BlogCardProps) {
  const t = useTranslations('components.blogCard');
  const locale = useLocale();

  const views = blog.views ?? 0;
  const readingTime = blog.avgReadingTime ?? blog.readingTime ?? 0;

  // One line, joined rather than laid out as separate nodes — every part is
  // already localised, so this stays a single readable run of text.
  const meta = [
    formatDate(blog.publishedDate, locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }),
    // `readingTime` is a plain placeholder, not a plural — it takes a string.
    readingTime > 0 ? t('readingTime', { time: String(readingTime) }) : null,
    t('views', { count: views }),
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border/60 bg-card transition-all duration-300 hover:border-border hover:shadow-md">
      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
        {blog.coverImage ? (
          <Image
            src={blog.coverImage.url}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
            className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <Layers className="size-10 text-muted-foreground/20" />
          </div>
        )}

        {!blog.isPublished && (
          <Badge className="absolute right-3 top-3 border-amber-500/30 bg-amber-500/15 text-amber-600 backdrop-blur-sm dark:text-amber-400">
            {t('draft')}
          </Badge>
        )}

        {blog.project?.title && (
          <Badge
            variant="secondary"
            className="absolute left-3 top-3 bg-background/90 backdrop-blur-sm"
          >
            {blog.project.title}
          </Badge>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5 md:gap-6">
        <p className="meta-label">{meta}</p>

        <h3 className="font-heading text-xl leading-snug tracking-tight">
          {/* The pseudo-element stretches over the whole card, so the card is one
              link and one tab stop. Previously the cover, the title and a "Read
              article" button were three separate links to the same URL. */}
          {/* Drafts 404 on the public detail route by design, so their card
              leads to the dashboard where the post can be edited/previewed. */}
          <Link
            href={blog.isPublished ? `/blogs/${blog.slug}` : '/dashboard/blogs'}
            locale={locale}
            className="line-clamp-2 after:absolute after:inset-0 after:content-[''] focus-visible:outline-none group-focus-within:underline group-focus-within:underline-offset-4 group-hover:underline group-hover:underline-offset-4"
          >
            {blog.title}
          </Link>
        </h3>

        {blog.description && (
          <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {blog.description}
          </p>
        )}

        {blog.tags.length > 0 && (
          // z-10 lifts the tags above the card-wide link overlay so they stay
          // clickable as filters.
          <div className="relative z-10 mt-auto flex flex-wrap gap-2 pt-2">
            {blog.tags.map((tag) => (
              <button
                key={tag.id}
                type="button"
                onClick={() => onTagClick?.(tag.slug)}
                className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                {tag.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
