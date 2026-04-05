'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import { Prisma } from '../../../../../../../packages/db/generated/prisma/client';

import { ApiActionResponse } from '@/types/api/api-action.type';
import { requireUser } from '@/lib/auth/session';





export type UserProfileWithTranslations = Prisma.UserGetPayload<{
  include: {
    userProfile: {
      include: {
        translations: true;
      };
    };
    socialLinks: true;
  };
}>;
export async function getUserProfileWithTranslations(
): Promise<ApiActionResponse<UserProfileWithTranslations>> {
  try {

    const user = await requireUser();
    const data = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      include: {
        userProfile: {
          include: {
            translations: true,
          },
        },
        socialLinks: true,
      },
    });

    return {
      success: true,
      data,
    };
  } catch (error: any) {
    logger.error(
      `[Service Error] getUserProfileWithTranslations: ${error.message}`
    );

    return {
      success: false,
      errorMsg: error.message || 'An unexpected error occurred',
    };
  }
}
