import { LikeButton } from './like-button';

import { getBlogInteractionsForUser } from '@/features/public/toggle-blog-interactions/lib';
import { INTERACTION } from '@/shared/lib/constants';

export async function LikeButtonWrapper({
  blogId,
  blogSlug,
}: {
  blogId: string;
  blogSlug: string;
}) {
  const data = await getBlogInteractionsForUser(blogId, INTERACTION.LIKE);

  return <LikeButton blogId={blogId} blogSlug={blogSlug} initialData={data} />;
}
