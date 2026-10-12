'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import type { AdminTechStack } from '@/entities/tech-stack/model/types';
import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';
import { idSchema, parseInput } from '@/shared/lib/validate-action-input';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

/**
 * The edit dialog's source of truth, with the logo the form shows. A list row
 * would do today; reusing one as `initialData` is the coupling AGENTS §8 names.
 */
export async function getAdminTechStackById(
  id: string
): Promise<ApiResponse<AdminTechStack>> {
  try {
    const user = await requireAdmin();

    const parsedId = parseInput(idSchema, id);
    if (!parsedId.ok) {
      return { success: false, errorMsg: parsedId.errorMsg };
    }

    const techStack = await prisma.techStack.findFirst({
      where: { id, userId: user.id },
      include: { logo: true },
    });

    if (!techStack) {
      return { success: false, errorMsg: 'Tech stack item not found' };
    }

    return { success: true, data: techStack };
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to fetch tech stack item');
    logger.error(`[TechStack] getAdminTechStackById: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
