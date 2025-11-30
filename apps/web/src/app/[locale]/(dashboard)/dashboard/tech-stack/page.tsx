import { prisma } from '@db/client';

import { getCurrentUser } from '@/lib/session';
import { TechStackManager } from '@/components/tech-stack-manager';





export const metadata = { title: 'Tech Stack' };

export default async function TechStackPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const techStacks = await prisma.techStack.findMany({
    where: { userId: user.id },
    orderBy: [{ group: 'asc' }, { name: 'asc' }],
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tech Stack</h1>
          <p className="text-muted-foreground">Manage your tech stacks</p>
        </div>
      </div>

      <TechStackManager initialTechStacks={techStacks} />
    </div>
  );
}
