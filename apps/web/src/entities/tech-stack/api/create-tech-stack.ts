'use server';

import type { ApiResponse } from '@byte-of-me/api-core';
import { parseInput } from '@byte-of-me/api-core/server';
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

export async function addTechStack(
  input: TechStackFormValues
): Promise<ApiResponse<AdminTechStack>> {
  const user = await requireAdmin();

  try {
    const parsed = parseInput(techStackSchema, input);
    if (!parsed.ok) {
      return { success: false, errorMsg: parsed.errorMsg };
    }
    const data = parsed.data;

    const newTech = await prisma.techStack.create({
      data: {
        slug: data.slug,
        name: data.name,
        group: data.group,
        logoId: data.logoId ?? null,
        userId: user.id,
      },
      include: {
        logo: true,
      },
    });

    for (const tag of TECH_MUTATION_TAGS) revalidateTag(tag, 'max');

    return { success: true, data: newTech };
  } catch (error) {
    logger.error(`addTechStack: ${getErrorMessage(error)}`);
    return { success: false, errorMsg: 'Failed to add tech stack item' };
  }
}
