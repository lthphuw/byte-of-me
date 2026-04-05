'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import { ApiActionResponse } from '@/types/api/api-action.type';
import { requireUser } from '@/lib/auth/session';





export async function deleteEducation(
  id: string
): Promise<ApiActionResponse<any>> {
  try {
    const user = await requireUser();

    const existing = await prisma.education.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return { success: false, errorMsg: 'Education not found' };
    }

    return {
      success: true ,
      data: await prisma.education.delete({
        where: { id },
      })
    };
  } catch (error: any) {
    logger.error(`Delete education error: ${error.message}`);
    return {
      success: false,
      errorMsg: error.message || 'Failed to delete education',
    };
  }
}
