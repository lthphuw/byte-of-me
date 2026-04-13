import { getAdminUserProfile } from '@/entities/user-profile/api/get-user-profile-with-translations';
import { UserProfileManager } from '@/widgets/dashboard/user-profile-manager/ui/user-profile-manager';

export const metadata = { title: 'Profile manager' };

export default async function UserProfilePage() {
  const resp = await getAdminUserProfile();

  if (!resp.success) {
    return null;
  }
  return (
    <div className="space-y-6">
      <UserProfileManager initUser={resp.data} />
    </div>
  );
}
