import { supportedLanguages } from '@/config/language';
import { fetchData } from '@/lib/fetch';
import { Project } from '@/components/project-list';
import { ProjectsContent } from '@/components/projects-content';
import { ProjectsShell } from '@/components/shell';

export function generateStaticParams() {
  return supportedLanguages.map((lang) => ({ locale: lang }));
}

export default async function ProjectsPage() {
  const projects = await fetchData<Project[]>('me/projects');
  return (
    <ProjectsShell>
      <ProjectsContent projects={projects} />
    </ProjectsShell>
  );
}
