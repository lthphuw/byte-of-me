import { getQueryClient } from '@byte-of-me/query';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { commentQueries } from '@/entities/comment/query/comment-queries';
import { CommentManager } from '@/widgets/dashboard/comment-manager';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('metadata.dashboard.comments');

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

export default async function CommentsPage() {
  // The factory the manager's `useAdminComments(1)` uses: one key, one query
  // function. A refused read is not dehydrated, so the client fetches it.
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery(commentQueries.adminPage(1));

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="space-y-6">
        <CommentManager />
      </div>
    </HydrationBoundary>
  );
}
