'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import type { AdminEducation } from '@/entities/education/model/types';
import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';
import type { ApiResponse } from '@/shared/types/api/api-response.type';





export async function getAllAdminEducations(): Promise<
  ApiResponse<AdminEducation[]>
> {
  try {
    const session = await requireAdmin();
    const educations = await prisma.education.findMany({
      where: {
        userId: session.id,
      },
      include: {
        logo: true,
        translations: true,
        achievements: {
          include: {
            translations: true,
            images: true,
          },
          orderBy: {
            sortOrder: 'asc',
          },
        },
      },
      orderBy: {
        sortOrder: 'desc',
      },
    });
    return {
      success: true,
      data: educations,
    };
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to fetch educations');
    logger.error(`Get Education get error: ${errorMsg}`);
    return {
      success: false,
      errorMsg,
    };
  }
}
