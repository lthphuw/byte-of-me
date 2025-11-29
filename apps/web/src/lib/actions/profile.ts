import { getCurrentUser } from '@/lib/session';
import { prisma } from '@db/client';
import * as z from 'zod';
import { profileSchema } from '@/lib/validations/profile';
import { revalidatePath } from 'next/cache';

export async function saveProfile(data: z.infer<typeof profileSchema>) {
  'use server';

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
