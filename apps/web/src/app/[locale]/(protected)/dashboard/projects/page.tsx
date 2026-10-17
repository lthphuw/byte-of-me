import { getQueryClient } from '@byte-of-me/query';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { projectQueries } from '@/entities/project/query';
import { ProjectManager } from '@/widgets/dashboard/project-manager';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('metadata.dashboard.projects');

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

export default async function ProjectsPage() {
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery(projectQueries.adminPage(1));

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="space-y-6">
        <ProjectManager />
      </div>
    </HydrationBoundary>
  );
}
