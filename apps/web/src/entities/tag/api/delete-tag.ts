'use server';

import type { ApiResponse } from '@byte-of-me/api-core';
import { idSchema, parseInput } from '@byte-of-me/api-core/server';
import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import { revalidateTag } from 'next/cache';

import { TAG_MUTATION_TAGS } from '@/entities/tag/model/revalidation';
import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';

export async function deleteTag(id: string): Promise<ApiResponse<null>> {
  await requireAdmin();

  try {
    const parsedId = parseInput(idSchema, id);
    if (!parsedId.ok) {
      return { success: false, errorMsg: parsedId.errorMsg };
    }

    // Deleting a tag cascades its `BlogTag` rows, so posts change too.
    await prisma.tag.delete({
      where: { id },
    });

    for (const tagName of TAG_MUTATION_TAGS) revalidateTag(tagName, 'max');

    return { success: true, data: null };
  } catch (error) {
    const errorMsg = getErrorMessage(error);
    logger.error(`[Tag] delete: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
