import { HydrationBoundary } from '@tanstack/react-query';
import type { Metadata } from 'next';

import { commentKeys, getPaginatedAdminComments } from '@/entities/comment';
import { prefetchAdminPage } from '@/shared/lib/query/prefetch-admin-page';
import { CommentManager } from '@/widgets/dashboard/comment-manager';

export const metadata: Metadata = {
  title: 'Comments',
  description: 'Moderate comments on your blogs and projects.',
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

export default async function CommentsPage() {
  const state = await prefetchAdminPage(
    commentKeys.adminList,
    getPaginatedAdminComments
  );

  return (
    <HydrationBoundary state={state}>
      <div className="space-y-6">
        <CommentManager />
      </div>
    </HydrationBoundary>
  );
}
