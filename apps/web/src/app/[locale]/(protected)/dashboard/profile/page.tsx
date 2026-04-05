import { getUserProfileWithTranslations } from '@/lib/actions/dashboard/user/get-user-profile-with-translations';
import { ProfileManager } from '@/components/profile-manager';

export const metadata = { title: 'Profile manager' };

export default async function ProfilePage() {
  const resp = await getUserProfileWithTranslations();

  if (!resp.success) {
    return null;
  }
  return (
    <div className="space-y-6">
      <ProfileManager initUser={resp.data} />
    </div>
  );
}
