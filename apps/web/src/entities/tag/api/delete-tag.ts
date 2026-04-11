'use server';

import { requireUser } from '@/features/auth/lib/session';
import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

export async function deleteTag(id: string) {
  try {
    await requireUser();

    await prisma.tag.delete({
      where: { id },
    });

    return { success: true };
  } catch (e: any) {
    logger.error(`[Tag] delete:`, e.message);
    return { success: false, errorMsg: e.message };
  }
}
