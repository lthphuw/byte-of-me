'use server';

import { getBlogInteractionsForUser } from '@/features/public';
import { LikeButton } from '@/features/public/toggle-blog-interactions/ui/like-button';
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
