import { Eye, Hourglass } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { getPublicBlogStats } from '@/features/public/blog-stats/lib';

export async function BlogLiveStats({ blogId }: { blogId: string }) {
  const stats = await getPublicBlogStats(blogId);
  const t = await getTranslations('blogDetails');

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
