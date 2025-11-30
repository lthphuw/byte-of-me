import { prisma } from '@db/client';
import { Briefcase, FileText, GraduationCap, Package } from 'lucide-react';

import { getCurrentUser } from '@/lib/session';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default async function DashboardPage() {
  const userSession = await getCurrentUser();
  if (!userSession) {
    throw new Error('User not authenticated');
  }

  const user = await prisma.user.findUnique({
    where: { email: userSession.email! },
  });

  if (!user) {
    throw new Error('User not found');
  }
  const [projectCount, expCount, eduCount, blogCount] = await Promise.all([
    prisma.project.count({ where: { userId: user.id } }),
    prisma.experience.count({ where: { userId: user.id } }),
    prisma.education.count({ where: { userId: user.id } }),
    prisma.blog.count({ where: { userId: user.id } }),
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, {user.name || 'User'}!
        </h1>
        <p className="text-muted-foreground">
          Manage your personal portfolio and track your content.
        </p>

        <p className="text-xs text-muted-foreground mt-1">
          Last updated: {user.updatedAt.toLocaleDateString()}
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Projects</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projectCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Experience</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{expCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Education</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{eduCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Blog Posts</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{blogCount}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
