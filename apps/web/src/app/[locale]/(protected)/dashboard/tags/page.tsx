import { getQueryClient } from '@byte-of-me/query';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { tagQueries } from '@/entities/tag/query';
import { TagManager } from '@/widgets/dashboard/tag-manager';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('metadata.dashboard.tags');

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

export default async function TagsPage() {
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery(tagQueries.adminPage(1));

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="space-y-6">
        <TagManager />
      </div>
    </HydrationBoundary>
  );
}
