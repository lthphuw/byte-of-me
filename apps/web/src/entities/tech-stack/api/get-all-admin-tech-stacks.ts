'use server';

import type { ApiResponse } from '@byte-of-me/api-core';
import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import type { AdminTechStack } from '@/entities/tech-stack/model/types';
import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';

/**
 * The manager's list and the picker options read this one action. Uncapped: the manager must show
 * every row and a silent `take` dropped the tail; a tech-stack list is a few dozen rows, so it
 * needs no ceiling.
 */
export async function getAllAdminTechStack(): Promise<
  ApiResponse<AdminTechStack[]>
> {
  const user = await requireAdmin();

  try {
    const techStacks = await prisma.techStack.findMany({
      where: { userId: user.id },
      include: { logo: true },
      orderBy: [{ group: 'asc' }, { sortOrder: 'asc' }],
    });

    return {
      success: true,
      data: techStacks,
    };
  } catch (error) {
    const errorMsg = getErrorMessage(error);
    logger.error(`[Service Error] getAllAdminTechStack: ${errorMsg}`);

    return {
      success: false,
      errorMsg,
    };
  }
}
