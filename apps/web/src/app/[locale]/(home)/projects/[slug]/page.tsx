import { Project, prisma } from '@db/index';

import { supportedLanguages } from '@/config/language';
import { dbCachingConfig } from '@/config/revalidate';
import { siteConfig } from '@/config/site';
import { fetchData, fetchREADMEData } from '@/lib/fetch';
import { extractToc } from '@/lib/markdown';
import { ProjectDetailsContent } from '@/components/project-details-content';
import { ProjectDetailsShell } from '@/components/shell';

type Props = {
  params: Promise<{ slug: string }>;
};

export async function getAllProjectSlugs() {
  const email = siteConfig.email;
  const user = await prisma.user.findUnique({
    cacheStrategy: dbCachingConfig,
    where: { email },
  });

  if (!user) return [];

  const projects = await prisma.project.findMany({
    cacheStrategy: dbCachingConfig,
    where: { userId: user.id },
    select: { id: true },
  });

  return projects.map((proj) => proj.id.toString());
}

export async function generateStaticParams() {
  try {
    const ids = await getAllProjectSlugs();
    if (!ids) return [];

    return supportedLanguages.flatMap((locale) =>
      ids.map((id) => ({
        locale,
        slug: id.toString(),
      }))
    );
  } catch (err) {
    console.error('generateStaticParams error:', err);
    return []; // fallback an toàn
  }
}

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
