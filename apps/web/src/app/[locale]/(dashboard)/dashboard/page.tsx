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

  const [projectCount, expCount, eduCount, blogCount] = await Promise.all([
    prisma.project.count({ where: { userId: user!.id } }),
    prisma.experience.count({ where: { userId: user!.id } }),
    prisma.education.count({ where: { userId: user!.id } }),
    prisma.blog.count({ where: { userId: user!.id } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Chào mừng trở lại, {user?.name || 'bạn'}!</h1>
        <p className="text-muted-foreground">Quản lý portfolio cá nhân của bạn</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dự án</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projectCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kinh nghiệm</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{expCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Học vấn</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{eduCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bài viết</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{blogCount}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Gợi ý nhanh</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              • Cập nhật ảnh đại diện và banner để portfolio đẹp hơn
            </p>
            <p className="text-sm text-muted-foreground">
              • Thêm ít nhất 3–5 dự án nổi bật
            </p>
            <p className="text-sm text-muted-foreground">
              • Viết blog chia sẻ kinh nghiệm sẽ tăng tương tác
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
