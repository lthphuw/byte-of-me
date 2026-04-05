import { getTranslations } from 'next-intl/server';

import { getDataForProjectsPage } from '@/lib/actions/public/get-data-for-projects-page';
import { getPaginatedPublicProjects } from '@/lib/actions/public/get-public-projects';
import { ProjectsContent } from '@/components/projects-content';
import { ProjectsShell } from '@/components/shell';





export default async function ProjectsPage() {
  const t = await getTranslations('project');

  const [dataResp, projectsResp] = await Promise.all([
    getDataForProjectsPage(),
    getPaginatedPublicProjects({
      page: 1,
      limit: 12,
    }),
  ]);

  if (!dataResp.success || !projectsResp.success) {
    return (
      <ProjectsShell>
        <div className="p-4">
          <p className="text-red-500">{t('failedToLoadProjectList')}</p>
        </div>
      </ProjectsShell>
    );
  }

  return (
    <ProjectsShell>
      <ProjectsContent
        initProjects={projectsResp.data}
        techStacks={dataResp.data.techStacks}
        tags={dataResp.data.tags}
      />
    </ProjectsShell>
  );
}
