import { getQueryClient } from '@byte-of-me/query';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { mediaQueries } from '@/entities/media/query/media-queries';
import { MediaManager } from '@/widgets/dashboard/media-manager';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('metadata.dashboard.media');

  return {
    title: t('title'),
    description: t('description'),
    robots: {
      index: false,
      follow: false,
      nocache: true,
      googleBot: {
        index: false,
        follow: false,
      },
    },
  };
}

export default async function MediaPage() {
  // The options the manager's `useMediaLibrary(1)` uses: one key, one query function.
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery(mediaQueries.library(1));

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="space-y-6">
        <MediaManager />
      </div>
    </HydrationBoundary>
  );
}
