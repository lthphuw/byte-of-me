'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@db/client';

import { getCurrentUser } from '@/lib/session';





export async function addProject(data: {
  title: string;
  description?: string;
  githubLink?: string | null;
  liveLink?: string | null;
  startDate?: Date | null;
  endDate?: Date | null;
  techStackIds: string[];
  tagIds: string[];
  coauthorIds: string[];
}) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('Unauthorized');

    const created = await prisma.project.create({
      data: {
        userId: user.id,
        title: data.title,
        description: data.description,
        githubLink: data.githubLink,
        liveLink: data.liveLink,
        startDate: data.startDate,
        endDate: data.endDate,
        techstacks: {
          create: data.techStackIds.map((id) => ({ techstackId: id })),
        },
        tags: {
          create: data.tagIds.map((id) => ({ tagId: id })),
        },
        coauthors: {
          create: data.coauthorIds.map((id) => ({ coauthorId: id })),
        },
      },
      include: {
        techstacks: { include: { techstack: true } },
        tags: { include: { tag: true } },
        coauthors: { include: { coauthor: true } },
        blogs: true,
      },
    });

    revalidatePath('/dashboard/projects');
    return created;
  } catch (error: any) {
    return null;
  }
}

export async function updateProject(data: {
  id: string;
  title: string;
  description?: string;
  githubLink?: string | null;
  liveLink?: string | null;
  startDate?: Date | null;
  endDate?: Date | null;
  techStackIds: string[];
  tagIds: string[];
  coauthorIds: string[];
}) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('Unauthorized');

    // Delete existing relations
    await prisma.techStackOnProjects.deleteMany({
      where: { projectId: data.id },
    });
    await prisma.tagsOnProjects.deleteMany({ where: { projectId: data.id } });
    await prisma.projectOnProjectCoAuthor.deleteMany({
      where: { projectId: data.id },
    });

    const updated = await prisma.project.update({
      where: { id: data.id },
      data: {
        title: data.title,
        description: data.description,
        githubLink: data.githubLink,
        liveLink: data.liveLink,
        startDate: data.startDate,
        endDate: data.endDate,
        techstacks: {
          create: data.techStackIds.map((id) => ({ techstackId: id })),
        },
        tags: {
          create: data.tagIds.map((id) => ({ tagId: id })),
        },
        coauthors: {
          create: data.coauthorIds.map((id) => ({ coauthorId: id })),
        },
      },
      include: {
        techstacks: { include: { techstack: true } },
        tags: { include: { tag: true } },
        coauthors: { include: { coauthor: true } },
        blogs: true,
      },
    });

    revalidatePath('/dashboard/projects');
    return updated;
  } catch (error: any) {
    return null;
  }
}

export async function deleteProject(id: string) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('Unauthorized');

    await prisma.project.delete({
      where: { id },
    });

    revalidatePath('/dashboard/projects');
    return true;
  } catch (error: any) {
    return false;
  }
}
