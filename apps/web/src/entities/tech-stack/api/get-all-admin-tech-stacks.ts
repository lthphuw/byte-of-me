'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import type { AdminTechStack } from '@/entities/tech-stack/model/types';
import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

/**
 * The manager's list and the picker options read this one action. It is not
 * capped: the manager must show every row, and a silent `take` dropped the tail.
 * A tech-stack list is one author's portfolio, a few dozen rows, so it needs no
 * ceiling. A count-based ceiling would have to show "N of M" instead.
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
