'use server';

import type { ApiResponse } from '@byte-of-me/api-core';
import { CACHE_TAGS } from '@byte-of-me/api-core';
import { idSchema, parseInput } from '@byte-of-me/api-core/server';
import { type Education, prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import { revalidateTag } from 'next/cache';

import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';

export async function deleteEducation(
  id: string
): Promise<ApiResponse<Education>> {
  const user = await requireAdmin();

  try {
    const parsedId = parseInput(idSchema, id);
    if (!parsedId.ok) {
      return { success: false, errorMsg: parsedId.errorMsg };
    }

    const existing = await prisma.education.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return { success: false, errorMsg: 'Education not found' };
    }

    const education = await prisma.education.delete({ where: { id } });

    revalidateTag(CACHE_TAGS.EDUCATION, 'max');

    return { success: true, data: education };
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to delete education');
    logger.error(`Delete education error: ${errorMsg}`);
    return {
      success: false,
      errorMsg,
    };
  }
}
