import { prisma } from '@db/client';

import { getCurrentUser } from '@/lib/session';
import { BlogManager } from '@/components/blog-manager';





export const metadata = { title: 'Blogs' };

export default async function BlogsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const blogs = await prisma.blog.findMany({
    where: { userId: user.id },
    include: {
      tags: { include: { tag: true } },
      project: true,
    },
    orderBy: { publishedDate: 'desc' },
  });

  const projects = await prisma.project.findMany({
    where: { userId: user.id },
    select: { id: true, title: true },
  });

  const tags = await prisma.tag.findMany();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Blogs</h1>
          <p className="text-muted-foreground">Manage your blogs</p>
        </div>
      </div>

      <BlogManager
        initialBlogs={blogs}
        availableProjects={projects}
        availableTags={tags}
      />
    </div>
  );
}
