'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import type { AdminEducation } from '@/entities/education/model/types';
import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';
import { idSchema, parseInput } from '@/shared/lib/validate-action-input';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

/**
 * The editor dialog's source of truth: list rows drop the achievements, so
 * reusing one as `initialData` would let a save overwrite real content with none.
 */
export async function getAdminEducationById(
  id: string
): Promise<ApiResponse<AdminEducation>> {
  try {
    const session = await requireAdmin();

    const parsedId = parseInput(idSchema, id);
    if (!parsedId.ok) {
      return { success: false, errorMsg: parsedId.errorMsg };
    }

    const education = await prisma.education.findFirst({
      where: { id, userId: session.id },
      include: {
        // Every locale, ordered: the dialog's language tabs edit them all, and
        // `deleteMany` + `create` on save reshuffles physical row order.
        translations: {
          select: { id: true, language: true, title: true, description: true },
          orderBy: { language: 'asc' },
        },
        achievements: {
          include: {
            translations: {
              select: { id: true, language: true, title: true, content: true },
              orderBy: { language: 'asc' },
            },
            images: { select: { mediaId: true } },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!education) {
      return { success: false, errorMsg: 'Education entry not found' };
    }

    return { success: true, data: education };
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to fetch education');
    logger.error(`Get admin education by id error: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
