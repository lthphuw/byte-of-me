'use client';

import { useQuery } from '@tanstack/react-query';
import { Eye, Hourglass } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { BlogLiveStatsSkeleton } from './blog-live-stats-loading';

import { getPublicBlogStats } from '@/entities/blog/api/get-public-blog-stats';
import { blogKeys } from '@/entities/blog/model/query-keys';

// The public segment is statically generated, so a server render of these
// stats would be frozen at build time. Fetching client-side keeps them
// genuinely live.
export function BlogLiveStats({ blogId }: { blogId: string }) {
  const t = useTranslations('blogDetails');

  const { data: stats, isLoading } = useQuery({
    queryKey: blogKeys.stats(blogId),
    // Unwrap the ApiResponse envelope; throwing on failure lets TanStack
    // Query keep any previously fetched stats instead of caching an error
    // payload, and the `!stats` fallback below renders the skeleton.
    queryFn: async () => {
      const res = await getPublicBlogStats(blogId);
      if (!res.success) throw new Error(res.errorMsg);
      return res.data;
    },
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
