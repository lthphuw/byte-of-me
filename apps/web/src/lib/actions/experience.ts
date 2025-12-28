// lib/actions/experience.ts
'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@db/client';

import { getCurrentUser } from '@/lib/session';





export async function addExperience(data: {
  company: string;
  logoUrl: string;
  location: string;
  type: string;
  description?: string;
  roles: {
    title: string;
    startDate: string;
    endDate?: string;
    tasks: { content: string }[];
  }[];
  techStackIds: string[];
}) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('Unauthorized');

    const created = await prisma.experience.create({
      data: {
        userId: user.id,
        company: data.company,
        logoUrl: data.logoUrl,
        location: data.location,
        type: data.type,
        description: data.description,
        roles: {
          create: data.roles.map((role) => ({
            title: role.title,
            startDate: new Date(role.startDate),
            endDate: role.endDate ? new Date(role.endDate) : null,
            tasks: {
              create: role.tasks,
            },
          })),
        },
        techstacks: {
          create: data.techStackIds.map((id) => ({
            techstackId: id,
          })),
        },
      },
      include: {
        roles: { include: { tasks: true } },
        techstacks: { include: { techstack: true } },
      },
    });

    revalidatePath('/dashboard/experience');
    return created;
  } catch (error: any) {
    return null;
  }
}

export async function updateExperience(data: {
  id: string;
  company: string;
  logoUrl: string;
  location: string;
  type: string;
  description?: string;
  roles: {
    title: string;
    startDate: string;
    endDate?: string;
    tasks: { content: string }[];
  }[];
  techStackIds: string[];
}) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('Unauthorized');

    // Delete existing roles and techstacks
    await prisma.experienceRole.deleteMany({
      where: { experienceId: data.id },
    });
    await prisma.techStackOnExperiences.deleteMany({
      where: { experienceId: data.id },
    });

    const updated = await prisma.experience.update({
      where: { id: data.id },
      data: {
        company: data.company,
        logoUrl: data.logoUrl,
        location: data.location,
        type: data.type,
        description: data.description,
        roles: {
          create: data.roles.map((role) => ({
            title: role.title,
            startDate: new Date(role.startDate),
            endDate: role.endDate ? new Date(role.endDate) : null,
            tasks: {
              create: role.tasks,
            },
          })),
        },
        techstacks: {
          create: data.techStackIds.map((id) => ({
            techstackId: id,
          })),
        },
      },
      include: {
        roles: { include: { tasks: true } },
        techstacks: { include: { techstack: true } },
      },
    });

    revalidatePath('/dashboard/experience');
    return updated;
  } catch (error: any) {
    return null;
  }
}

export async function deleteExperience(id: string) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('Unauthorized');

    await prisma.experience.delete({
      where: { id },
    });

    revalidatePath('/dashboard/experience');
    return true;
  } catch (error: any) {
    return false;
  }
}
