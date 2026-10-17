import type { INTERACTION } from '@byte-of-me/api-core';

import { BlogInteractionButton } from './blog-interaction-button';

import { getBlogInteractionsOnce } from '@/features/public/toggle-blog-interactions/lib/get-blog-interactions-once';

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
