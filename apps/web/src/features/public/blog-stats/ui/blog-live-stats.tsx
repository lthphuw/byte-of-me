'use client';

import { Button } from '@byte-of-me/ui';
import { Eye, Hourglass } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { BlogLiveStatsSkeleton } from './blog-live-stats-loading';

import { usePublicBlogStats } from '@/entities/blog/query';
import { ContentFade } from '@/shared/ui/content-fade';

// The public segment is statically generated, so a server render of these
// stats would be frozen at build time. Fetching client-side keeps them
// genuinely live.
export function BlogLiveStats({ blogId }: { blogId: string }) {
  const t = useTranslations('blogDetails');
  const { data: stats, isError, refetch } = usePublicBlogStats(blogId);

  // No numbers yet: the skeleton while the read runs, and a retry if it failed.
  // Never a zero standing in for a failed read.
  if (!stats) {
    return isError ? (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground md:text-base">
        <span>{t('statsLoadFailed')}</span>
        <Button
          variant="link"
          size="sm"
          className="h-auto p-0"
          onClick={() => void refetch()}
        >
          {t('retry')}
        </Button>
      </div>
    ) : (
      <BlogLiveStatsSkeleton />
    );
  }

  // The skeleton above is swapped for these numbers when the query resolves; the fade
  // is what keeps that swap from popping.
  return (
    <ContentFade>
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
    </ContentFade>
  );
}
