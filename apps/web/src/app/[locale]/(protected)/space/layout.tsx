import type { Metadata } from 'next';

import { getUserProfile } from '@/entities/user-profile/api/get-user-profile';
import { buildIconSet } from '@/shared/lib/metadata';
import { SpaceShell } from '@/widgets/dashboard/space-shell';

export async function generateMetadata(): Promise<Metadata> {
  const profileRes = await getUserProfile();
  const userName = profileRes.data?.displayName || 'Admin';

  return {
    title: `Space | Welcome, ${userName}`,
    description: 'Personal workspace to manage notes, schedule.',
    // The most enclosed layer of the mark: knocked out of a solid plate, so a
    // vault tab is the one silhouette that reads instantly in a crowded strip.
    icons: buildIconSet('space'),
    robots: {
      index: false,
      follow: false,
      nocache: true,
      googleBot: {
        index: false,
        follow: false,
      },
    },
  };
}

export default async function SpaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SpaceShell>{children}</SpaceShell>;
}
