import { prisma } from '@db/client';

import { getCurrentUser } from '@/lib/session';
import { ExperienceManager } from '@/components/experience-manager';





export const metadata = { title: 'Experience' };

export default async function ExperiencePage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const experiences = await prisma.experience.findMany({
    where: { userId: user.id },
    include: {
      roles: { include: { tasks: true } },
      techstacks: { include: { techstack: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const techStacks = await prisma.techStack.findMany({
    where: { userId: user.id },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Experience</h1>
          <p className="text-muted-foreground">Manage your work experiences</p>
        </div>
      </div>

      <ExperienceManager
        initialExperiences={experiences}
        availableTechStacks={techStacks}
      />
    </div>
  );
}
