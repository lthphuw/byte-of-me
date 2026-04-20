'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import { revalidateTag } from 'next/cache';

import { requireAdmin } from '@/shared/lib/auth';
import { CACHE_TAGS } from '@/shared/lib/constants';





export async function deleteTag(id: string) {
  try {
    await requireAdmin();

    await prisma.tag.delete({
      where: { id },
    });

    revalidateTag(CACHE_TAGS.TAG, 'max');

    return { success: true };
  } catch (e: Any) {
    logger.error(`[Tag] delete:`, e.message);
    return { success: false, errorMsg: e.message };
  }
}
