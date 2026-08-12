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
    // `flex-wrap` is the backstop, not the primary fit: the five controls fit
    // one line at 375px (the narrowest supported viewport) now that
    // comment/share/PDF go icon-only below `sm`. It stays because the buttons
    // carry `whitespace-nowrap` and cannot shrink — a five-digit like count or
    // a longer locale would otherwise push the PDF link past the layout's
    // `overflow-x-clip` and cut it off silently.
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
