'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import type { AdminTechStack } from '@/entities/tech-stack';
import { requireAdmin } from '@/shared/lib/auth';
import type { ApiResponse } from '@/shared/types/api/api-response.type';





export async function getAllAdminTechStack(): Promise<
  ApiResponse<AdminTechStack[]>
> {
  try {
    const user = await requireAdmin();

    const techStacks = await prisma.techStack.findMany({
      where: { userId: user.id },
      include: { logo: true },
      orderBy: [{ group: 'asc' }, { sortOrder: 'asc' }],
    });

    return {
      success: true,
      data: techStacks,
    };
  } catch (error: Any) {
    logger.error(`[Service Error] getAllAdminTechStack: ${error.message}`);

    return {
      success: false,
      errorMsg: error.message || 'An unexpected error occurred',
    };
  }
}
