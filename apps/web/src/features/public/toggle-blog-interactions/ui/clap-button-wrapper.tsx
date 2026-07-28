import { ClapButton } from './clap-button';

import { getBlogInteractionsForUser } from '@/features/public/toggle-blog-interactions/lib';
import { INTERACTION } from '@/shared/lib/constants';

export async function ClapButtonWrapper({
  blogId,
  blogSlug,
}: {
  blogId: string;
  blogSlug: string;
}) {
  const data = await getBlogInteractionsForUser(blogId, INTERACTION.CLAP);

  return <ClapButton blogId={blogId} blogSlug={blogSlug} initialData={data} />;
}
