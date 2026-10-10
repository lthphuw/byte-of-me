import { HydrationBoundary } from '@tanstack/react-query';
import type { Metadata } from 'next';

import { getPaginatedAdminFeaturedWorks } from '@/entities/featured-work/api/get-paginated-admin-featured-works';
import { featuredWorkKeys } from '@/entities/featured-work/model/query-keys';
import { prefetchAdminPage } from '@/shared/lib/query/prefetch-admin-page';
import { FeaturedWorkManager } from '@/widgets/dashboard/featured-work-manager';

export const metadata: Metadata = {
  title: 'Featured work',
  description: 'Choose the contributions pinned to the top of your homepage.',
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

export default async function FeaturedWorksPage() {
  const state = await prefetchAdminPage(
    featuredWorkKeys.adminPage,
    getPaginatedAdminFeaturedWorks
  );

  return (
    <HydrationBoundary state={state}>
      <div className="space-y-6">
        <FeaturedWorkManager />
      </div>
    </HydrationBoundary>
  );
}
