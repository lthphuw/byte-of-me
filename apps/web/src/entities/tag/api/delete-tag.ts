'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import { revalidateTag } from 'next/cache';

import { CACHE_TAGS } from '@/shared/lib/constants';
import { requireUser } from '@/shared/lib/session';

export async function deleteTag(id: string) {
  try {
    await requireUser();

    await prisma.tag.delete({
      where: { id },
    });

    revalidateTag(CACHE_TAGS.TAG, 'max');

    return { success: true };
  } catch (e: any) {
    logger.error(`[Tag] delete:`, e.message);
    return { success: false, errorMsg: e.message };
  }
}
