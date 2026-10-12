'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import { adminTagInclude } from '@/entities/tag/model/admin-tag-include';
import type { AdminTag } from '@/entities/tag/model/types';
import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';
import { idSchema, parseInput } from '@/shared/lib/validate-action-input';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

/**
 * The edit dialog's source of truth: a tag's per-language rows, one per locale.
 * Reusing a list row would open the form on whatever the list selects (AGENTS §8).
 */
export async function getAdminTagById(id: string): Promise<ApiResponse<AdminTag>> {
  try {
    await requireAdmin();

    const parsedId = parseInput(idSchema, id);
    if (!parsedId.ok) {
      return { success: false, errorMsg: parsedId.errorMsg };
    }

    const tag = await prisma.tag.findUnique({
      where: { id },
      include: adminTagInclude,
    });

    if (!tag) {
      return { success: false, errorMsg: 'Tag not found' };
    }

    return { success: true, data: tag };
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to fetch tag');
    logger.error(`[Tag] getAdminTagById: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
