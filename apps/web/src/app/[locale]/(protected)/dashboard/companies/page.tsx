import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { companyQueries } from '@/entities/company/query';
import { getQueryClient } from '@/shared/lib/query/get-query-client';
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
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery(companyQueries.adminPage(1));

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="space-y-6">
        <CompanyManager />
      </div>
    </HydrationBoundary>
  );
}
