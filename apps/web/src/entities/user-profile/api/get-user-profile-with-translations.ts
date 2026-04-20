'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import type { AdminUserProfile } from '@/entities/user-profile';
import { requireAdmin } from '@/shared/lib/auth';
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
  } catch (error: Any) {
    logger.error(`[Service Error] getAdminUserProfile: ${error.message}`);

    return {
      success: false,
      errorMsg: error.message || 'An unexpected error occurred',
    };
  }
}
