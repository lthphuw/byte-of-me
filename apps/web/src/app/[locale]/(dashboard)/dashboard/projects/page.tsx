import { prisma } from '@db/client';

import { getCurrentUser } from '@/lib/session';
import { ProjectManager } from '@/components/project-manager';





export const metadata = { title: 'Projects' };

export default async function ProjectsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const projects = await prisma.project.findMany({
    where: { userId: user.id },
    include: {
      techstacks: { include: { techstack: true } },
      tags: { include: { tag: true } },
      coauthors: { include: { coauthor: true } },
      blogs: true,
    },
    orderBy: [{ startDate: 'desc' }],
  });

  const techStacks = await prisma.techStack.findMany({
    where: { userId: user.id },
  });

  const tags = await prisma.tag.findMany();

  const coauthors = await prisma.coauthor.findMany();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground">Manage your projects</p>
        </div>
      </div>

      <ProjectManager
        initialProjects={projects}
        availableTechStacks={techStacks}
        availableTags={tags}
        availableCoauthors={coauthors}
      />
    </div>
  );
}
