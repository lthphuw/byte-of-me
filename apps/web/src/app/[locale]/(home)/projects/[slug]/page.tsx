import { Project } from '@db/index';

import { fetchData, fetchREADMEData } from '@/lib/fetch';
import { extractToc } from '@/lib/markdown';
import { ProjectDetailsContent } from '@/components/project-details-content';
import { ProjectDetailsShell } from '@/components/shell';

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function ProjectDetailPage({ params }: Props) {
  const { slug } = await params;

  const project = await fetchData<Project>(`me/projects/${slug}`);
  if (!project?.githubLink) {
    return 'Project or GitHub URL not found.';
  }

  const readme = await fetchREADMEData(project.githubLink);
  if (!readme) {
    return `README.md not found for ${project.githubLink}`;
  }

  const tocItems = extractToc(readme)
    .filter((item) => item.depth === 2)
    .map((item) => ({
      href: `#${item.id}`,
      label: item.text,
    }));

  return (
    <ProjectDetailsShell>
      <ProjectDetailsContent tocItems={tocItems} readme={readme} />
    </ProjectDetailsShell>
  );
}
