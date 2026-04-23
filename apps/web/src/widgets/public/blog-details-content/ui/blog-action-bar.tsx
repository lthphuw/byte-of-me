import { Suspense } from 'react';

import { BlogCommentShareActions } from '@/widgets/public/blog-details-content/ui/blog-comment-share-actions';
import {
  ClapButtonWrapper,
  InteractionButtonLoading,
  LikeButtonWrapper,
} from '@/features/public';

export function BlogActionBar({
  blogId,
  blogSlug,
  title,
  noCommentAppear,
}: {
  blogId: string;
  blogSlug: string;
  title: string;
  noCommentAppear?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 py-2">
      <div className={'flex items-center gap-2 ml-[-4px]'}>
        <Suspense fallback={<InteractionButtonLoading />}>
          <LikeButtonWrapper blogId={blogId} blogSlug={blogSlug} />
        </Suspense>

        <Suspense fallback={<InteractionButtonLoading />}>
          <ClapButtonWrapper blogId={blogId} blogSlug={blogSlug} />
        </Suspense>
      </div>

      <BlogCommentShareActions
        title={title}
        noCommentAppear={noCommentAppear}
      />
    </div>
  );
}
