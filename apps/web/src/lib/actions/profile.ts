'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@db/client';
import * as z from 'zod';

import { profileSchema } from '@/lib/schemas/profile';
import { getCurrentUser } from '@/lib/session';

export async function saveProfile(data: z.infer<typeof profileSchema>) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('Unauthorized');

    await prisma.user.update({
      where: { id: user.id },
      data,
    });

    revalidatePath('/dashboard/profile');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function saveAvatar(base64: string) {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: { image: base64 },
    });

    revalidatePath('/dashboard/profile');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
