import { getUserProfile } from '@/entities/user-profile/api/get-user-profile';
import { getDashboardStats } from '@/features/dashboard/dashboard-stats/lib/get-dashboard-stats';
import { StatsGrid } from '@/features/dashboard/dashboard-stats/ui/stats-grid';
import { Separator } from '@/shared/ui/separator';
import { ContactMessageGallery } from '@/widgets/contact-message-gallery/ui/contact-message-gallery';

export default async function DashboardPage() {
  const [user, statsResponse] = await Promise.all([
    getUserProfile(),
    getDashboardStats(),
  ]);

  if (!user.success || !statsResponse.success || !statsResponse.data) {
    throw new Error('Failed to load dashboard data');
  }

  const stats = statsResponse.data;

  return (
    <div className="space-y-10 pb-10">
      {/* Header Section */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          Welcome back, {user.data.displayName}! 👋
        </h1>
        <p className="text-muted-foreground text-lg">
          Manage your personal portfolio and track your content performance.
        </p>
      </div>

      <StatsGrid stats={stats} />

      <Separator className="my-8" />

      <div className="space-y-6">
        <ContactMessageGallery />
      </div>
    </div>
  );
}
