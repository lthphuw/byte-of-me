import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { getAdminUserProfile } from '@/entities/user-profile';
import { SectionLoadError } from '@/shared/ui';
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
  const [resp, tError] = await Promise.all([
    getAdminUserProfile(),
    getTranslations('components.sectionLoadError'),
  ]);

  if (!resp.success) {
    return (
      <div className="flex h-[400px] items-center justify-center rounded-xl border-2 border-dashed">
        <SectionLoadError
          title={tError('title')}
          description={tError('description')}
          retryLabel={tError('retry')}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <UserProfileManager initUser={resp.data} />
    </div>
  );
}
