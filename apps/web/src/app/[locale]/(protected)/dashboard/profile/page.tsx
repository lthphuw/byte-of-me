import { getAdminUserProfile } from '@/entities/user-profile/api/get-user-profile-with-translations';
import { ProfileManager } from '@/widgets/user-profile-manager/ui/profile-manager';

export const metadata = { title: 'Profile manager' };

export default async function ProfilePage() {
  const resp = await getAdminUserProfile();

  if (!resp.success) {
    return null;
  }
  return (
    <div className="space-y-6">
      <ProfileManager initUser={resp.data} />
    </div>
  );
}
