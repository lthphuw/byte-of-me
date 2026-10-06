import { HydrationBoundary } from '@tanstack/react-query';
import type { Metadata } from 'next';

import { getPaginatedAdminEducations } from '@/entities/education/api/get-paginated-admin-educations';
import { educationKeys } from '@/entities/education/model/query-keys';
import { prefetchAdminPage } from '@/shared/lib/query/prefetch-admin-page';
import { EducationManager } from '@/widgets/dashboard/education-manager';

export const metadata: Metadata = {
  title: 'Education',
  description:
    'Manage your academic history, certifications, and achievements.',
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
