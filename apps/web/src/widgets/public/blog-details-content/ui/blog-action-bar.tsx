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
  noCommentAppear,
}: {
  blogId: string;
  blogSlug: string;
  title: string;
  noCommentAppear?: boolean;
}) {
  return (
    // `flex-wrap`: measured at 375px (the narrowest supported viewport) in
    // Vietnamese, the widest locale — the container leaves 311px and the five
    // controls need 335px, so without this the PDF link is clipped by the
    // layout's `overflow-x-clip`. Wrapping drops the comment/share/PDF group
    // onto its own line instead; the buttons carry `whitespace-nowrap`, so
    // they cannot shrink to fit.
    <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 py-2">
      <div className={'ml-[-4px] flex items-center gap-2'}>
        <Suspense fallback={<InteractionButtonLoading />}>
          <LikeButtonWrapper blogId={blogId} blogSlug={blogSlug} />
        </Suspense>

        <Suspense fallback={<InteractionButtonLoading />}>
          <ClapButtonWrapper blogId={blogId} blogSlug={blogSlug} />
        </Suspense>
      </div>

      <BlogCommentShareActions
        slug={blogSlug}
        title={title}
        noCommentAppear={noCommentAppear}
      />
    </div>
  );
}
