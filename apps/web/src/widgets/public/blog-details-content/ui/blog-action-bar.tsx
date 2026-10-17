import { Suspense } from 'react';
import { INTERACTION } from '@byte-of-me/api-core';
import { ContentFade } from '@byte-of-me/ui';

import {
  BlogInteractionWrapper,
  InteractionButtonLoading,
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
    // `flex-wrap` is the backstop: five controls fit one line at 375px (icon-only below `sm`), but
    // buttons are `whitespace-nowrap`, so a five-digit count or longer locale would push PDF past
    // `overflow-x-clip` and cut it off. `gap-2` on both axes: 4px is under §14's 8px touch gap.
    <div className="flex flex-wrap items-center justify-between gap-2 py-2">
      <div className={'ml-[-4px] flex items-center gap-2'}>
        <Suspense fallback={<InteractionButtonLoading />}>
          <ContentFade>
            <BlogInteractionWrapper
              kind={INTERACTION.LIKE}
              blogId={blogId}
              blogSlug={blogSlug}
            />
          </ContentFade>
        </Suspense>

        <Suspense fallback={<InteractionButtonLoading />}>
          <ContentFade>
            <BlogInteractionWrapper
              kind={INTERACTION.CLAP}
              blogId={blogId}
              blogSlug={blogSlug}
            />
          </ContentFade>
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
