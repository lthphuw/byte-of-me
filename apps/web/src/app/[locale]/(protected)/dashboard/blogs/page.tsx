import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { blogQueries } from '@/entities/blog/query';
import { getQueryClient } from '@/shared/lib/query/get-query-client';
import { BlogManager } from '@/widgets/dashboard/blog-manager';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('metadata.dashboard.blogs');

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

export default async function BlogsPage() {
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery(blogQueries.adminPage(1));

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="space-y-6">
        <BlogManager />
      </div>
    </HydrationBoundary>
  );
}
