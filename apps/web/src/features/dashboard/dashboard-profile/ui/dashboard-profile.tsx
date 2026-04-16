import { getUserProfile } from '@/entities/user-profile/api/get-user-profile';

export async function DashboardProfile() {
  const profileRes = await getUserProfile();
  if (!profileRes.success || !profileRes.data) {
    return;
  }

  const userProfile = profileRes.data;

  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
        Welcome back, {userProfile.displayName}! 👋
      </h1>

      <p className="text-muted-foreground text-lg">
        Manage your personal portfolio and track your content performance.
      </p>
    </div>
  );
}
