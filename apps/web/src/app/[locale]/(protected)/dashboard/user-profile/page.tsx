import type { Metadata } from 'next';

import { getAdminUserProfile } from '@/entities';
import { UserProfileManager } from '@/widgets/dashboard';

export const metadata: Metadata = {
  title: 'Profile Manager | Dashboard',
  description:
    'Update your public profile information, social links, and display settings.',
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

export default async function UserProfilePage() {
  const resp = await getAdminUserProfile();

  if (!resp.success || !resp.data) {
    return (
      <div className="flex h-[400px] items-center justify-center rounded-xl border-2 border-dashed">
        <div className="text-center">
          <h3 className="font-semibold">Profile not found</h3>
          <p className="text-sm text-muted-foreground">
            Could not load your profile data at this time.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Profile Settings</h1>
        <p className="text-muted-foreground">
          Manage how your information appears across your portfolio.
        </p>
      </div>

      <UserProfileManager initUser={resp.data} />
    </div>
  );
}
