'use client';

import { useQuery } from '@tanstack/react-query';
import { Eye, Hourglass } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { BlogLiveStatsSkeleton } from './blog-live-stats-loading';

import { getPublicBlogStats } from '@/entities/blog/api/get-public-blog-stats';
import { CACHE_TAGS } from '@/shared/lib/constants';

// The public segment is statically generated, so a server render of these
// stats would be frozen at build time. Fetching client-side (same query key
// as BlogCard, so the cache is shared) keeps them genuinely live.
export function BlogLiveStats({ blogId }: { blogId: string }) {
  const t = useTranslations('blogDetails');

  const { data: stats, isLoading } = useQuery({
    queryKey: [CACHE_TAGS.BLOG, blogId],
    queryFn: () => getPublicBlogStats(blogId),
    staleTime: 1000 * 60 * 5,
  });

  if (isLoading || !stats) {
    return <BlogLiveStatsSkeleton />;
  }

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground md:text-base">
      <div className="flex items-center gap-1.5 whitespace-nowrap">
        <Eye className="h-4 w-4 shrink-0" />
        <span>{t('views', { count: stats.views })}</span>
      </div>
      <div className="flex items-center gap-1.5 whitespace-nowrap">
        <Hourglass className="h-4 w-4 shrink-0" />
        <span>{t('readingTime', { time: stats.avgTime.toString() })}</span>
      </div>
    </div>
  );
}
