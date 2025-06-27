import { fetchData } from '@/lib/fetch';
import { Project } from '@/components/project-list';
import { ProjectsContent } from '@/components/projects-content';
import { ProjectsShell } from '@/components/shell';

export default async function ProjectsPage() {
  const projects = await fetchData<Project[]>('me/projects');
  return (
    <ProjectsShell>
      <ProjectsContent projects={projects} />
    </ProjectsShell>
  );
}
