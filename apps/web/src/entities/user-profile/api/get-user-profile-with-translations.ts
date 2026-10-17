'use server';

import type { ApiResponse } from '@byte-of-me/api-core';
import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import type { AdminUserProfile } from '@/entities/user-profile/model/types';
import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';

export async function getAdminUserProfile(): Promise<
  ApiResponse<AdminUserProfile>
> {
  const user = await requireAdmin();

  try {
    const data = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      include: {
        userProfile: {
          include: {
            // The form renders each field per translation. middleName and id sit
            // in its state unrendered; the two timestamps and the FK are dropped.
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
