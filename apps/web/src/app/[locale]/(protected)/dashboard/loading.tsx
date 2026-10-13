import { Separator } from '@byte-of-me/ui';
import { BarChart3 } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import {
  AnalyticsOverviewLoading,
  DashboardProfileLoading,
  StatsGridLoading,
} from '@/features/dashboard';
import { ContactMessageGalleryLoading } from '@/widgets/dashboard/contact-message-gallery';

/** The dashboard home's blocks, in the same order and spacing as `page.tsx`. */
export default async function DashboardHomeLoading() {
  const t = await getTranslations('dashboard.dashboard');

  return (
    <div className="space-y-10 pb-10" aria-busy="true">
      <section>
        <DashboardProfileLoading />
      </section>

      <section>
        <StatsGridLoading />
      </section>

      <section className="space-y-6">
        <div className="border-b pb-4">
          <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
            <BarChart3 className="h-5 w-5 text-primary" />
            {t('analyticsTitle')}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t('analyticsDescription')}
          </p>
        </div>
        <AnalyticsOverviewLoading />
      </section>

      <Separator className="my-8" />

      <section className="space-y-6">
        <ContactMessageGalleryLoading />
      </section>
    </div>
  );
}
