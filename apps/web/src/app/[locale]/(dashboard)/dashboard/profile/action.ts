'use server';

import { getCurrentUser } from '@/lib/session';
import { revalidatePath } from 'next/cache';
import { prisma } from '@db/client';

export async function saveProfile(data: any) {
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
