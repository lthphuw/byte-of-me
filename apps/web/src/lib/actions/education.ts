'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@db/client';

import { getCurrentUser } from '@/lib/session';





export async function addEducation(data: {
  timeline: string;
  title: string;
  message?: string;
  icon?: string;
  subItems: { title: string; message?: string }[];
}) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('Unauthorized');

    const created = await prisma.education.create({
      data: {
        userId: user.id,
        timeline: data.timeline,
        title: data.title,
        message: data.message,
        icon: data.icon,
        subItems: {
          create: data.subItems,
        },
      },
      include: { subItems: true },
    });

    revalidatePath('/dashboard/education');
    return created;
  } catch (error: any) {
    return null;
  }
}

export async function updateEducation(data: {
  id: string;
  timeline: string;
  title: string;
  message?: string;
  icon?: string;
  subItems: { title: string; message?: string }[];
}) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('Unauthorized');

    // First, delete existing subitems
    await prisma.educationSubItem.deleteMany({
      where: { educationId: data.id },
    });

    // Then update education and create new subitems
    const updated = await prisma.education.update({
      where: { id: data.id },
      data: {
        timeline: data.timeline,
        title: data.title,
        message: data.message,
        icon: data.icon,
        subItems: {
          create: data.subItems,
        },
      },
      include: { subItems: true },
    });

    revalidatePath('/dashboard/education');
    return updated;
  } catch (error: any) {
    return null;
  }
}

export async function deleteEducation(id: string) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('Unauthorized');

    await prisma.education.delete({
      where: { id },
    });

    revalidatePath('/dashboard/education');
    return true;
  } catch (error: any) {
    return false;
  }
}
