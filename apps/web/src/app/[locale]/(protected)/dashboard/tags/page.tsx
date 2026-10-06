import { HydrationBoundary } from '@tanstack/react-query';
import type { Metadata } from 'next';

import { getPaginatedAdminTags, tagKeys } from '@/entities/tag';
import { prefetchAdminPage } from '@/shared/lib/query/prefetch-admin-page';
import { TagManager } from '@/widgets/dashboard/tag-manager';





export const metadata: Metadata = {
  title: 'Tags',
  description: 'Organize and manage tags for projects and blog posts.',
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
