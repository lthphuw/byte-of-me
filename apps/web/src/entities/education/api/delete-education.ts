'use server';

import { type Education, prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import { revalidateTag } from 'next/cache';

import { requireAdmin } from '@/shared/lib/auth';
import { CACHE_TAGS } from '@/shared/lib/constants';
import { getErrorMessage } from '@/shared/lib/utils';
import type { ApiResponse } from '@/shared/types/api/api-response.type';





export async function deleteEducation(
  id: string
): Promise<ApiResponse<Education>> {
  try {
    const user = await requireAdmin();

    const existing = await prisma.education.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return { success: false, errorMsg: 'Education not found' };
    }

    revalidateTag(CACHE_TAGS.EDUCATION, 'max');

    return {
      success: true,
      data: await prisma.education.delete({
        where: { id },
      }),
    };
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to delete educationSchema');
    logger.error(`Delete education error: ${errorMsg}`);
    return {
      success: false,
      errorMsg,
    };
  }
}
