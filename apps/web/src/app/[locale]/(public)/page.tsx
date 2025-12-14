import { Prisma } from '@repo/db/generated/prisma/client';

import { fetchData } from '@/lib/core/fetch';
import { HomepageContent } from '@/components/homepage-content';
import { HomeShell } from '@/components/shell';





export default async function HomePage() {
  const user = await fetchData<
    Prisma.UserGetPayload<{
      include: {
        bannerImages: true;
      };
    }>
  >('me', {
    params: {
      bannerImages: 'true',
    },
  });

  return (
    <HomeShell>
      <HomepageContent user={user} />
    </HomeShell>
  );
}
