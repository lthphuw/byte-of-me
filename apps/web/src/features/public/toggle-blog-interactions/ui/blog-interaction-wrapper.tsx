import { BlogInteractionButton } from './blog-interaction-button';

import { getBlogInteractionsOnce } from '@/features/public/toggle-blog-interactions/lib/get-blog-interactions-once';
import type { INTERACTION } from '@/shared/lib/constants';

/**
 * Server seed for one reaction. A failed read is not rendered as zero: the
 * button is given no seed, reads the count itself, and shows its own error.
 */
export async function BlogInteractionWrapper({
  kind,
  blogId,
  blogSlug,
}: {
  kind: INTERACTION;
  blogId: string;
  blogSlug: string;
}) {
  const res = await getBlogInteractionsOnce(blogId, kind);

  return (
    <BlogInteractionButton
      kind={kind}
      blogId={blogId}
      blogSlug={blogSlug}
      seed={res.success ? res.data : undefined}
    />
  );
}
