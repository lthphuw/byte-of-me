import { HydrationBoundary } from '@tanstack/react-query';
import type { Metadata } from 'next';

import { getPaginatedAdminProjects, projectKeys } from '@/entities/project';
import { prefetchAdminPage } from '@/shared/lib/query/prefetch-admin-page';
import { ProjectManager } from '@/widgets/dashboard/project-manager';





export const metadata: Metadata = {
  title: 'Projects',
  description: 'Showcase your work and manage project details.',
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

export default async function ProjectsPage() {
  const state = await prefetchAdminPage(
    projectKeys.adminPage,
    getPaginatedAdminProjects
  );

  return (
    <HydrationBoundary state={state}>
      <div className="space-y-6">
        <ProjectManager />
      </div>
    </HydrationBoundary>
  );
}
