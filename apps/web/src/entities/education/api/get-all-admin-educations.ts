'use server';

import { AdminEducation } from '@/entities/education';
import { requireUser } from '@/features/auth/lib/session';
import { ApiResponse } from '@/shared/types/api/api-response.type';
import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

export async function getAllAdminEducations(): Promise<
  ApiResponse<AdminEducation[]>
> {
  try {
    const session = await requireUser();
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
  } catch (error: any) {
    logger.error(`Get Education get error: ${error.message}`);
    return {
      success: false,
      errorMsg: error.message || 'Failed to fetch educations',
    };
  }
}
