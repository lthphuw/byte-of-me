'use server';

import { requireUser } from '@/features/auth/lib/session';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

export async function deleteEducation(id: string): Promise<ApiResponse<any>> {
  try {
    const user = await requireUser();

    const existing = await prisma.education.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return { success: false, errorMsg: 'PublicEducation not found' };
    }

    return {
      success: true,
      data: await prisma.education.delete({
        where: { id },
      }),
    };
  } catch (error: any) {
    logger.error(`Delete education error: ${error.message}`);
    return {
      success: false,
      errorMsg: error.message || 'Failed to delete educationSchema',
    };
  }
}
