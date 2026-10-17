'use server';

import type { ApiResponse } from '@byte-of-me/api-core';
import { idSchema, parseInput } from '@byte-of-me/api-core/server';
import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import { revalidateTag } from 'next/cache';

import { TECH_MUTATION_TAGS } from '@/entities/tech-stack/model/revalidation';
import {
  type TechStackFormValues,
  techStackSchema,
} from '@/entities/tech-stack/model/tech-stack-schema';
import type { AdminTechStack } from '@/entities/tech-stack/model/types';
import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';

export async function updateTechStack(
  id: string,
  input: TechStackFormValues
): Promise<ApiResponse<AdminTechStack>> {
  const user = await requireAdmin();

  try {
    const parsedId = parseInput(idSchema, id);
    if (!parsedId.ok) {
      return { success: false, errorMsg: parsedId.errorMsg };
    }
    const parsed = parseInput(techStackSchema, input);
    if (!parsed.ok) {
      return { success: false, errorMsg: parsed.errorMsg };
    }
    const data = parsed.data;

    const result = await prisma.techStack.updateMany({
      where: {
        id,
        userId: user.id,
      },
      data: {
        slug: data.slug,
        name: data.name,
        group: data.group,
        logoId: data.logoId ?? null,
      },
    });

    if (result.count === 0) {
      return {
        success: false,
        errorMsg: 'Tech stack item not found or unauthorized',
      };
    }

    const updatedRecord = await prisma.techStack.findUnique({
      where: { id },
      include: { logo: true },
    });

    if (!updatedRecord) {
      return { success: false, errorMsg: 'Tech stack item not found' };
    }

    for (const tag of TECH_MUTATION_TAGS) revalidateTag(tag, 'max');

    return { success: true, data: updatedRecord };
  } catch (error) {
    logger.error(`updateTechStack: ${getErrorMessage(error)}`);
    return { success: false, errorMsg: 'Failed to update tech stack' };
  }
}
