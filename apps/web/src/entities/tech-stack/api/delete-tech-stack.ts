'use server';

import { prisma } from '@byte-of-me/db';
import { revalidateTag } from 'next/cache';

import { requireAdmin } from '@/shared/lib/auth';
import { CACHE_TAGS } from '@/shared/lib/constants';





export async function deleteTechStack(id: string) {
  try {
    const user = await requireAdmin();

    const res = await prisma.techStack.deleteMany({
      where: { id, userId: user.id },
    });
    revalidateTag(CACHE_TAGS.TECH, 'max');

    return !!res.count;
  } catch (error: Any) {
    console.error('deleteTechStack:', error.message);
    return false;
  }
}
