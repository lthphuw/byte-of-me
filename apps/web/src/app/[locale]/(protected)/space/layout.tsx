import type { Metadata } from 'next';

import { getUserProfile } from '@/entities/user-profile/api/get-user-profile';
import { SpaceShell } from '@/widgets/dashboard/space-shell';

export async function generateMetadata(): Promise<Metadata> {
  const profileRes = await getUserProfile();
  const userName = profileRes.data?.displayName || 'Admin';

  return {
    title: `Space | Welcome, ${userName}`,
    description: 'Personal workspace to manage notes, schedule.',
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
