'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@db/client';

import { getCurrentUser } from '@/lib/session';





export async function addBlog(data: {
  title: string;
  content: string;
  slug: string;
  publishedDate: Date;
  projectId?: string | null;
  tagIds: string[];
}) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('Unauthorized');

    const created = await prisma.blog.create({
      data: {
        userId: user.id,
        title: data.title,
        content: data.content,
        slug: data.slug,
        publishedDate: data.publishedDate,
        projectId: data.projectId,
        tags: {
          create: data.tagIds.map((id) => ({ tagId: id })),
        },
      },
      include: {
        tags: { include: { tag: true } },
        project: true,
      },
    });

    revalidatePath('/dashboard/blogs');
    return created;
  } catch (error: any) {
    return null;
  }
}

export async function updateBlog(data: {
  id: string;
  title: string;
  content: string;
  slug: string;
  publishedDate: Date;
  projectId?: string | null;
  tagIds: string[];
}) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('Unauthorized');

    await prisma.blogTag.deleteMany({ where: { blogId: data.id } });

    const updated = await prisma.blog.update({
      where: { id: data.id },
      data: {
        title: data.title,
        content: data.content,
        slug: data.slug,
        publishedDate: data.publishedDate,
        projectId: data.projectId,
        tags: {
          create: data.tagIds.map((id) => ({ tagId: id })),
        },
      },
      include: {
        tags: { include: { tag: true } },
        project: true,
      },
    });

    revalidatePath('/dashboard/blogs');
    return updated;
  } catch (error: any) {
    return null;
  }
}

export async function deleteBlog(id: string) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('Unauthorized');

    await prisma.blog.delete({
      where: { id },
    });

    revalidatePath('/dashboard/blogs');
    return true;
  } catch (error: any) {
    return false;
  }
}
