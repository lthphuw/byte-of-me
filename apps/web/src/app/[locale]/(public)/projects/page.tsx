import { Tag, TechStack } from '@repo/db/generated/prisma/client';

import { fetchData } from '@/lib/core/fetch';
import { ProjectProps } from '@/components/project-list';
import { ProjectsContent } from '@/components/projects-content';
import { ProjectsShell } from '@/components/shell';

export default async function ProjectsPage() {
  const projects = await fetchData<ProjectProps[]>('me/projects');
  const techStacks = await fetchData<TechStack[]>('techstacks');
  const tags = await fetchData<Tag[]>('tags');

  return (
    <ProjectsShell>
      <ProjectsContent
        projects={projects}
        techStacks={techStacks}
        tags={tags}
      />
    </ProjectsShell>
  );
}
