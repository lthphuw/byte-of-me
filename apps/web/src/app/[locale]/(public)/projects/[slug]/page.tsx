import { fetchData } from '@/lib/core/fetch';
import { ProjectDetailsContent } from '@/components/project-details-content';
import { ProjectDetailsShell } from '@/components/shell';

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function ProjectDetailPage({ params }: Props) {
  const { slug } = await params;
  const project: any = await fetchData(`me/projects/${slug}`);

  return (
    <ProjectDetailsShell>
      <ProjectDetailsContent project={project} />
    </ProjectDetailsShell>
  );
}
