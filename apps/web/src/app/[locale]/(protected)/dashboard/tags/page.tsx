import { HydrationBoundary } from '@tanstack/react-query';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { getPaginatedAdminTags, tagKeys } from '@/entities/tag';
import { prefetchAdminPage } from '@/shared/lib/query/prefetch-admin-page';
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
  const state = await prefetchAdminPage(
    tagKeys.adminPage,
    getPaginatedAdminTags
  );

  return (
    <HydrationBoundary state={state}>
      <div className="space-y-6">
        <TagManager />
      </div>
    </HydrationBoundary>
  );
}
