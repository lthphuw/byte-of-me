import { prisma } from '@db/client';

import { getCurrentUser } from '@/lib/session';
import { EducationManager } from '@/components/education-manager';





export const metadata = { title: 'Education' };

export default async function EducationPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const educations = await prisma.education.findMany({
    where: { userId: user.id },
    include: { subItems: true },
    orderBy: { timeline: 'desc' },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Education</h1>
          <p className="text-muted-foreground">Manage your education entries</p>
        </div>
      </div>

      <EducationManager initialEducations={educations as any} />
    </div>
  );
}
