import { getTranslations } from 'next-intl/server';

import { getUserProfile } from '@/entities/user-profile/api/get-user-profile';

export async function DashboardProfile() {
  const [profileRes, t] = await Promise.all([
    getUserProfile(),
    getTranslations('dashboard.dashboard'),
  ]);

  // Not `null`: this is the page's `h1`, so failing silently left the
  // dashboard with no heading at all.
  if (!profileRes.success || !profileRes.data) {
    return <p className="text-sm text-destructive-text">{t('sectionError')}</p>;
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
