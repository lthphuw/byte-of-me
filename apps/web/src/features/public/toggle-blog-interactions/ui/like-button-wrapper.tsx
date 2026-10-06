import { LikeButton } from './like-button';

import { getBlogInteractionsOnce } from '@/features/public/toggle-blog-interactions/lib/get-blog-interactions-once';
import { INTERACTION } from '@/shared/lib/constants';

export async function LikeButtonWrapper({
  blogId,
  blogSlug,
}: {
  blogId: string;
  blogSlug: string;
}) {
  const data = await getBlogInteractionsOnce(blogId, INTERACTION.LIKE);

  return <LikeButton blogId={blogId} blogSlug={blogSlug} initialData={data} />;
}
