'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@db/client';

import { getCurrentUser } from '@/lib/session';





export async function addTranslation(data: {
  sourceText: string;
  translated: string;
  language: string;
  resourceType?: string | null;
  resourceId?: string | null;
}) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('Unauthorized');

    const created = await prisma.translation.create({
      data,
    });

    revalidatePath('/dashboard/translations');
    return created;
  } catch (error: any) {
    return null;
  }
}

export async function updateTranslation(data: {
  id: string;
  sourceText: string;
  translated: string;
  language: string;
  resourceType?: string | null;
  resourceId?: string | null;
}) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('Unauthorized');

    const updated = await prisma.translation.update({
      where: { id: data.id },
      data: {
        sourceText: data.sourceText,
        translated: data.translated,
        language: data.language,
        resourceType: data.resourceType,
        resourceId: data.resourceId,
      },
    });

    revalidatePath('/dashboard/translations');
    return updated;
  } catch (error: any) {
    return null;
  }
}

export async function deleteTranslation(id: string) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('Unauthorized');

    await prisma.translation.delete({
      where: { id },
    });

    revalidatePath('/dashboard/translations');
    return true;
  } catch (error: any) {
    return false;
  }
}
