'use server';

import { prisma } from '@byte-of-me/db';
import { revalidateTag } from 'next/cache';

import { requireUser } from '@/shared/lib/auth';
import { CACHE_TAGS } from '@/shared/lib/constants';

export async function hideComment(commentId: string) {
  const user = await requireUser();

  await prisma.comment.update({
    where: {
      id: commentId,
    },
    data: {
      isDeleted: true,
    },
  });

  revalidateTag(CACHE_TAGS.COMMENT, 'max');
}
