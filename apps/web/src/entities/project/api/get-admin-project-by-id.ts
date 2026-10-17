'use server';

import type { ApiResponse } from '@byte-of-me/api-core';
import { idSchema, parseInput } from '@byte-of-me/api-core/server';
import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import { adminProjectInclude } from '@/entities/project/model/admin-project-include';
import type { AdminProject } from '@/entities/project/model/types';
import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';

/**
 * The edit dialog's source of truth. The list row carries the same fields
 * today, but a dialog seeded from a row would silently inherit whatever the
 * list stops selecting (AGENTS §8).
 */
export async function getAdminProjectById(
  id: string
): Promise<ApiResponse<AdminProject>> {
  const user = await requireAdmin();

  try {
    const parsedId = parseInput(idSchema, id);
    if (!parsedId.ok) {
      return { success: false, errorMsg: parsedId.errorMsg };
    }

    const project = await prisma.project.findFirst({
      where: { id, userId: user.id },
      include: adminProjectInclude,
    });

    if (!project) {
      return { success: false, errorMsg: 'Project not found' };
    }

    return { success: true, data: project };
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to fetch project');
    logger.error(`[Project] getAdminProjectById: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
