import { getTranslations } from 'next-intl/server';

import { getUserProfile } from '@/entities/user-profile/api/get-user-profile';
import { SectionLoadError } from '@/shared/ui';

export async function DashboardProfile() {
  const [profileRes, t, tError] = await Promise.all([
    getUserProfile(),
    getTranslations('dashboard.dashboard'),
    getTranslations('components.sectionLoadError'),
  ]);

  // Not `null`: this is the page's `h1`, so failing silently left the
  // dashboard with no heading at all.
  if (!profileRes.success) {
    return (
      <SectionLoadError
        title={t('sectionError')}
        retryLabel={tError('retry')}
      />
    );
  }

  const userProfile = profileRes.data;

  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
        {t('welcome', { name: userProfile.displayName || '' })}
      </h1>

      <p className="text-lg text-muted-foreground">{t('description')}</p>
    </div>
  );
}
