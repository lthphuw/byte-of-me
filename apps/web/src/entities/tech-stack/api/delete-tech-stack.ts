'use server';

import { prisma } from '@byte-of-me/db';

import { requireUser } from '@/features/auth/lib/session';

export async function deleteTechStack(id: string) {
  try {
    const user = await requireUser();

    const res = await prisma.techStack.deleteMany({
      where: { id, userId: user.id },
    });

    return !!res.count;
  } catch (error: any) {
    console.error('deleteTechStack:', error.message);
    return false;
  }
}
