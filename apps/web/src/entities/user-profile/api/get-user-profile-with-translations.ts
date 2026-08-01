'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import type { AdminUserProfile } from '@/entities/user-profile/model/types';
import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

export async function getAdminUserProfile(): Promise<
  ApiResponse<AdminUserProfile>
> {
  try {
    const user = await requireAdmin();
    const data = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      include: {
        userProfile: {
          include: {
            // use-profile-controller.tsx's form reads every one of these
            // per translation; only the two timestamps and the redundant FK
            // are dropped.
            translations: {
              select: {
                id: true,
                language: true,
                displayName: true,
                firstName: true,
                middleName: true,
                lastName: true,
                greeting: true,
                tagLine: true,
                quote: true,
                quoteAuthor: true,
                bio: true,
                aboutMe: true,
              },
            },
          },
        },
        socialLinks: true,
      },
    });

    return {
      success: true,
      data,
    };
  } catch (error) {
    const errorMsg = getErrorMessage(error);
    logger.error(`[Service Error] getAdminUserProfile: ${errorMsg}`);

    return {
      success: false,
      errorMsg,
    };
  }
}
