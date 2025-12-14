'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@db/client';

import { getCurrentUser } from '@/lib/session';





export async function addTechStack(data: {
  slug: string;
  name: string;
  group: string;
  logo?: string | null;
}) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('Unauthorized');

    const created = await prisma.techStack.create({
      data: {
        slug: data.slug,
        userId: user.id,
        name: data.name,
        group: data.group,
        logo: data.logo,
      },
    });

    revalidatePath('/dashboard/tech-stack');
    return created;
  } catch (error: any) {
    return null;
  }
}

export async function updateTechStack(data: {
  id: string;
  name: string;
  group: string;
  logo?: string | null;
}) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('Unauthorized');

    const updated = await prisma.techStack.update({
      where: { id: data.id },
      data: {
        name: data.name,
        group: data.group,
        logo: data.logo,
      },
    });

    revalidatePath('/dashboard/tech-stack');
    return updated;
  } catch (error: any) {
    return null;
  }
}

export async function deleteTechStack(id: string) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('Unauthorized');

    await prisma.techStack.delete({
      where: { id },
    });

    revalidatePath('/dashboard/tech-stack');
    return true;
  } catch (error: any) {
    return false;
  }
}
