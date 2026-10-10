'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import type { AdminFeaturedWorkDetail } from '@/entities/featured-work/model/types';
import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';
import { idSchema, parseInput } from '@/shared/lib/validate-action-input';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

/**
 * The editor dialog's source of truth. The list row omits `details`, so the
 * dialog loads the full row here: reusing a list row as `initialData` would open
 * the editor with an empty body and let the next save clear the stored one.
 */
export async function getAdminFeaturedWorkById(
  id: string
): Promise<ApiResponse<AdminFeaturedWorkDetail>> {
  try {
    const user = await requireAdmin();

    const parsedId = parseInput(idSchema, id);
    if (!parsedId.ok) {
      return { success: false, errorMsg: parsedId.errorMsg };
    }

    // Every locale, so the form's language fieldsets can show each stored body.
    const featuredWork = await prisma.featuredWork.findFirst({
      where: { id, userId: user.id },
      include: {
        translations: {
          select: {
            id: true,
            language: true,
            title: true,
            description: true,
            details: true,
          },
          orderBy: { language: 'asc' },
        },
      },
    });

    if (!featuredWork) {
      return { success: false, errorMsg: 'Featured work not found' };
    }
    return { success: true, data: featuredWork };
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to fetch featured work');
    logger.error(`Get admin featured work by id error: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
