'use server';

import type { ApiResponse } from '@byte-of-me/api-core';
import { CACHE_TAGS } from '@byte-of-me/api-core';
import { idSchema, parseInput } from '@byte-of-me/api-core/server';
import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import { revalidateTag } from 'next/cache';

import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';

export async function deleteProject(id: string): Promise<ApiResponse<null>> {
  const user = await requireAdmin();

  try {
    const parsedId = parseInput(idSchema, id);
    if (!parsedId.ok) {
      return { success: false, errorMsg: parsedId.errorMsg };
    }

    await prisma.project.delete({ where: { id, userId: user.id } });
    // Public blogs embed the related project's title and slug.
    revalidateTag(CACHE_TAGS.PROJECT, 'max');
    revalidateTag(CACHE_TAGS.BLOG, 'max');

    return { success: true, data: null };
  } catch (error) {
    const errorMsg = getErrorMessage(error);
    logger.error(`[Project] delete: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
