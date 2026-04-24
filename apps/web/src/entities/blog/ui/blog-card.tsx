'use client';

import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  ArrowRight,
  Calendar,
  Clock,
  Eye,
  Layers,
  Tag as TagIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import type { PublicBlog } from '@/entities/blog/model/types';
import { getPublicBlogStats } from '@/features/public/blog-stats/lib';
import { CACHE_TAGS } from '@/shared/lib/constants';
import { Badge , Card, CardContent , Skeleton } from '@/shared/ui';

interface BlogCardProps {
  blog: PublicBlog;
  onTagClick?: (slug: string) => void;
}

export function BlogCard({ blog, onTagClick }: BlogCardProps) {
  const t = useTranslations('components.blogCard');

  const { data, isLoading } = useQuery({
    queryKey: [CACHE_TAGS.BLOG, blog.id],
    queryFn: () => getPublicBlogStats(blog.id),
    staleTime: 1000 * 60 * 5,
  });

  const views = data?.views ?? blog.views ?? 0;
  const avgTime = data?.avgTime ?? blog.avgReadingTime ?? 0;

  return (
    <Card className="group flex flex-col overflow-hidden border-2 transition-all hover:border-primary/50 hover:shadow-xl">
      {/* Cover Image Area */}
      <Link
        href={`/blogs/${blog.slug}`}
        className="relative aspect-video overflow-hidden bg-muted"
      >
        {blog.coverImage ? (
          <img
            src={blog.coverImage.url}
            alt={blog.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Layers className="h-12 w-12 text-muted-foreground/20" />
          </div>
        )}

        {blog.project && (
          <div className="absolute left-3 top-3">
            <Badge
              variant="secondary"
              className="bg-background/90 shadow-sm backdrop-blur-sm"
            >
              {blog.project.title}
            </Badge>
          </div>
        )}
      </Link>

      <CardContent className="flex flex-1 flex-col p-4">
        {/* Metadata */}
        <div className="mb-3 flex items-center gap-3 text-[10px] uppercase tracking-wider text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {blog.publishedDate
              ? format(new Date(blog.publishedDate), 'MMM dd, yyyy')
              : 'Draft'}
          </div>
        </div>

        {/* Title & Description */}
        <Link
          href={`/blogs/${blog.slug}`}
          className="mb-2 block transition-colors group-hover:text-primary"
        >
          <h3 className="line-clamp-2 text-xl font-bold leading-tight">
            {blog.title}
          </h3>
        </Link>
        <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">
          {blog.description}
        </p>

        {/* Tags Area */}
        <div className="mb-6 flex flex-wrap gap-1.5">
          {blog.tags.map((tag) => (
            <button
              key={tag.id}
              onClick={(e) => {
                e.preventDefault();
                onTagClick?.(tag.slug);
              }}
              className="inline-flex items-center gap-1 rounded-full bg-primary/5 px-2.5 py-0.5 text-[10px] font-medium text-primary transition-colors hover:bg-primary/10"
            >
              <TagIcon className="h-2 w-2" />
              {tag.name}
            </button>
          ))}
        </div>

        {/* Stats & CTA Row */}
        <div className="mt-auto flex items-center justify-between border-t pt-4">
          <div className="flex items-center gap-4 text-[11px] font-medium text-muted-foreground">
            {/* Views Stat */}
            <div className="flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" />
              {isLoading ? (
                <Skeleton className="h-3 w-8" />
              ) : (
                <span>{t('views', { count: views })}</span>
              )}
            </div>

            {/* Reading Time Stat */}
            <div className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {isLoading ? (
                <Skeleton className="h-3 w-6" />
              ) : (
                <span>{avgTime}m</span>
              )}
            </div>
          </div>

          <Link
            href={`/blogs/${blog.slug}`}
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary transition-all hover:gap-3"
          >
            {t('readArticle')}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
