import { Suspense } from 'react';

import {
  ClapButtonWrapper,
  InteractionButtonLoading,
  LikeButtonWrapper,
} from '@/features/public';
import { BlogCommentShareActions } from '@/widgets/public/blog-details-content/ui/blog-comment-share-actions';

export function BlogActionBar({
  blogId,
  blogSlug,
  title,
}: {
  blogId: string;
  blogSlug: string;
  title: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2 py-3">
      <div className={'flex items-center gap-2'}>
        <Suspense fallback={<InteractionButtonLoading />}>
          <LikeButtonWrapper blogId={blogId} blogSlug={blogSlug} />
        </Suspense>

        <Suspense fallback={<InteractionButtonLoading />}>
          <ClapButtonWrapper blogId={blogId} blogSlug={blogSlug} />
        </Suspense>
      </div>

      <BlogCommentShareActions title={title} />
    </div>
  );
}
