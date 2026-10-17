import { getQueryClient } from '@byte-of-me/query';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { featuredWorkQueries } from '@/entities/featured-work/query';
import { FeaturedWorkManager } from '@/widgets/dashboard/featured-work-manager';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('metadata.dashboard.featuredWorks');

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

export default async function FeaturedWorksPage() {
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery(featuredWorkQueries.adminPage(1));

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="space-y-6">
        <FeaturedWorkManager />
      </div>
    </HydrationBoundary>
  );
}
