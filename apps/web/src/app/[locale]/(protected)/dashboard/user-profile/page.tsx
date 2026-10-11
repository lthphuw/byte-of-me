import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { getAdminUserProfile } from '@/entities/user-profile';
import { UserProfileManager } from '@/widgets/dashboard/user-profile-manager';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('metadata.dashboard.userProfile');

  return {
    title: t('title'),
    description: t('description'),
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
      <UserProfileManager initUser={resp.data} />
    </div>
  );
}
