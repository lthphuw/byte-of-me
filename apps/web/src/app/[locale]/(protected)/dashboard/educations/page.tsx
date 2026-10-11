import { HydrationBoundary } from '@tanstack/react-query';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { getPaginatedAdminEducations } from '@/entities/education/api/get-paginated-admin-educations';
import { educationKeys } from '@/entities/education/model/query-keys';
import { prefetchAdminPage } from '@/shared/lib/query/prefetch-admin-page';
import { EducationManager } from '@/widgets/dashboard/education-manager';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('metadata.dashboard.educations');

  return {
    title: t('title'),
    description: t('description'),
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

export default async function EducationPage() {
  const state = await prefetchAdminPage(
    educationKeys.adminPage,
    getPaginatedAdminEducations
  );

  return (
    <HydrationBoundary state={state}>
      <div className="space-y-6">
        <EducationManager />
      </div>
    </HydrationBoundary>
  );
}
