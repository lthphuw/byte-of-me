import { ClapButton } from './clap-button';

import { getBlogInteractionsOnce } from '@/features/public/toggle-blog-interactions/lib/get-blog-interactions-once';
import { INTERACTION } from '@/shared/lib/constants';

export async function ClapButtonWrapper({
  blogId,
  blogSlug,
}: {
  blogId: string;
  blogSlug: string;
}) {
  const data = await getBlogInteractionsOnce(blogId, INTERACTION.CLAP);

  return <ClapButton blogId={blogId} blogSlug={blogSlug} initialData={data} />;
}
