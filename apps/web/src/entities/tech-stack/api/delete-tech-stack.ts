'use server';

import { requireUser } from '@/features/auth/lib/session';
import { prisma } from '@byte-of-me/db';

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
