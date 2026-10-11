import { HydrationBoundary } from '@tanstack/react-query';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { getPaginatedAdminCompanies } from '@/entities/company/api/get-paginated-admin-companies';
import { companyKeys } from '@/entities/company/model/query-keys';
import { prefetchAdminPage } from '@/shared/lib/query/prefetch-admin-page';
import { CompanyManager } from '@/widgets/dashboard/company-manager';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('metadata.dashboard.companies');

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

export default async function CompaniesPage() {
  const state = await prefetchAdminPage(
    companyKeys.adminPage,
    getPaginatedAdminCompanies
  );

  return (
    <HydrationBoundary state={state}>
      <div className="space-y-6">
        <CompanyManager />
      </div>
    </HydrationBoundary>
  );
}
