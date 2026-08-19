import { Suspense } from 'react';
import { Separator } from '@byte-of-me/ui';
import { BarChart3 } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { getOwnerDisplayName } from '@/entities/user-profile/api/get-owner-display-name';
import {
  AnalyticsOverview,
  AnalyticsOverviewLoading,
  DashboardProfile,
  DashboardProfileLoading,
  StatsGrid,
  StatsGridLoading,
} from '@/features/dashboard';
import { ContactMessageGallery } from '@/widgets/dashboard/contact-message-gallery/ui/contact-message-gallery';

export async function generateMetadata(): Promise<Metadata> {
  // `getOwnerDisplayName`, not `getUserProfile`: a name is all a tab label
  // needs, and `DashboardProfile` reads the full profile in this same request —
  // which `getUserProfile`'s `'use server'` puts beyond React `cache()`.
  const userName = await getOwnerDisplayName();

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
  const t = await getTranslations('dashboard.dashboard');

  return (
    <div className="space-y-10 pb-10">
      <section aria-label={t('sections.profile')}>
        <Suspense fallback={<DashboardProfileLoading />}>
          <DashboardProfile />
        </Suspense>
      </section>

      <section aria-label={t('sections.stats')}>
        <Suspense fallback={<StatsGridLoading />}>
          <StatsGrid />
        </Suspense>
      </section>

      <section aria-label={t('sections.analytics')} className="space-y-6">
        <div className="border-b pb-4">
          <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
            <BarChart3 className="h-5 w-5 text-primary" />
            {t('analyticsTitle')}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t('analyticsDescription')}
          </p>
        </div>
        <Suspense fallback={<AnalyticsOverviewLoading />}>
          <AnalyticsOverview />
        </Suspense>
      </section>

      <Separator className="my-8" />

      <section aria-label={t('sections.messages')} className="space-y-6">
        <ContactMessageGallery />
      </section>
    </div>
  );
}
