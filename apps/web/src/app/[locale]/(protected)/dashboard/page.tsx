import { Suspense } from 'react';
import type { Metadata } from 'next';

import { getUserProfile } from '@/entities/user-profile/api/get-user-profile';
import {
  DashboardProfile,
  DashboardProfileLoading,
  StatsGrid,
  StatsGridLoading,
} from '@/features/dashboard';
import { Separator } from '@/shared/ui/separator';
import { ContactMessageGallery } from '@/widgets/dashboard/contact-message-gallery/ui/contact-message-gallery';

export async function generateMetadata(): Promise<Metadata> {
  const profileRes = await getUserProfile();
  const userName = profileRes.data?.displayName || 'Admin';

  return {
    title: `Dashboard | Welcome, ${userName}`,
    description:
      'Manage your personal portfolio, track engagement stats, and view messages.',
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

export default async function DashboardPage() {
  return (
    <div className="space-y-10 pb-10">
      <section aria-label="Profile Summary">
        <Suspense fallback={<DashboardProfileLoading />}>
          <DashboardProfile />
        </Suspense>
      </section>

      <section aria-label="Statistics Overview">
        <Suspense fallback={<StatsGridLoading />}>
          <StatsGrid />
        </Suspense>
      </section>

      <Separator className="my-8" />

      <section aria-label="Contact Messages" className="space-y-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold tracking-tight">
            Inbound Messages
          </h2>
          <p className="text-sm text-muted-foreground">
            Recent inquiries from your portfolio contact form.
          </p>
        </div>
        <ContactMessageGallery />
      </section>
    </div>
  );
}
