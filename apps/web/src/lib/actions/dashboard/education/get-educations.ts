'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import { ApiActionResponse } from '@/types/api/api-action.type';
import { requireUser } from '@/lib/auth/session';

import { Prisma } from '../../../../../../../packages/db/generated/prisma/client';

export type EducationDetails = Prisma.EducationGetPayload<{
  include: {
    logo: true;
    translations: true;
    achievements: {
      include: {
        translations: true;
        images: true;
      };
    };
  };
}>;

export async function getEducations(): Promise<
  ApiActionResponse<EducationDetails[]>
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
