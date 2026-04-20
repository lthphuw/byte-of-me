'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import { revalidateTag } from 'next/cache';

import { requireAdmin } from '@/shared/lib/auth';
import { CACHE_TAGS } from '@/shared/lib/constants';
import type { ApiResponse } from '@/shared/types/api/api-response.type';





export async function deleteEducation(id: string): Promise<ApiResponse<Any>> {
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
  } catch (error: Any) {
    logger.error(`Delete education error: ${error.message}`);
    return {
      success: false,
      errorMsg: error.message || 'Failed to delete educationSchema',
    };
  }
}
