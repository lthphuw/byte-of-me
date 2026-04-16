'use server';

import { prisma } from '@byte-of-me/db';
import { revalidateTag } from 'next/cache';

import { CACHE_TAGS } from '@/shared/lib/constants';
import { requireUser } from '@/shared/lib/session';

export async function deleteTechStack(id: string) {
  try {
    const user = await requireUser();

    const res = await prisma.techStack.deleteMany({
      where: { id, userId: user.id },
    });
    revalidateTag(CACHE_TAGS.TECH, 'max');

    return !!res.count;
  } catch (error: any) {
    console.error('deleteTechStack:', error.message);
    return false;
  }
}
