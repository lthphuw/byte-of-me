'use server';

import type { ApiResponse } from '@byte-of-me/api-core';
import { idSchema, parseInput } from '@byte-of-me/api-core/server';
import { TECH_MUTATION_TAGS } from '@byte-of-me/contracts/tech-stack';
import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import { revalidateTag } from 'next/cache';

import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';

export async function deleteTechStack(id: string): Promise<ApiResponse<null>> {
  const user = await requireAdmin();

  try {
    const parsedId = parseInput(idSchema, id);
    if (!parsedId.ok) {
      return { success: false, errorMsg: parsedId.errorMsg };
    }

    const res = await prisma.techStack.deleteMany({
      where: { id, userId: user.id },
    });

    if (res.count === 0) {
      return {
        success: false,
        errorMsg: 'Tech stack item not found or unauthorized',
      };
    }

    for (const tag of TECH_MUTATION_TAGS) revalidateTag(tag, 'max');

    return { success: true, data: null };
  } catch (error) {
    logger.error(`deleteTechStack: ${getErrorMessage(error)}`);
    return { success: false, errorMsg: 'Failed to delete tech stack' };
  }
}
