import { HydrationBoundary } from '@tanstack/react-query';
import type { Metadata } from 'next';

import { getPaginatedAdminBlogs } from '@/entities/blog';
import { blogKeys } from '@/entities/blog/model/query-keys';
import { prefetchAdminPage } from '@/shared/lib/query/prefetch-admin-page';
import { BlogManager } from '@/widgets/dashboard/blog-manager';

export const metadata: Metadata = {
  title: 'Blog Management',
  description: 'Write, edit, and publish articles for your portfolio blog.',
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

export default async function BlogsPage() {
  const state = await prefetchAdminPage(
    blogKeys.adminPage,
    getPaginatedAdminBlogs
  );

  return (
    <HydrationBoundary state={state}>
      <div className="space-y-6">
        <BlogManager />
      </div>
    </HydrationBoundary>
  );
}
