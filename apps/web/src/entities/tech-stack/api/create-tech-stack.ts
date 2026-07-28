'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import { revalidateTag } from 'next/cache';

import {
  type TechStackFormValues,
  techStackSchema,
} from '@/entities/tech-stack/model/tech-stack-schema';
import type { AdminTechStack } from '@/entities/tech-stack/model/types';
import { requireAdmin } from '@/shared/lib/auth';
import { CACHE_TAGS } from '@/shared/lib/constants';
import { getErrorMessage } from '@/shared/lib/utils';
import { parseInput } from '@/shared/lib/validate-action-input';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

export async function addTechStack(
  input: TechStackFormValues
): Promise<ApiResponse<AdminTechStack>> {
  try {
    const user = await requireAdmin();

    const parsed = parseInput(techStackSchema, input);
    if (!parsed.ok) {
      return { success: false, errorMsg: parsed.errorMsg };
    }
    const data = parsed.data;

    const newTech = await prisma.techStack.create({
      data: {
        ...data,
        logoId: data.logoId ?? null,
        userId: user.id,
      },
      include: {
        logo: true,
      },
    });

    revalidateTag(CACHE_TAGS.TECH, 'max');

    return { success: true, data: newTech };
  } catch (error) {
    logger.error(`addTechStack: ${getErrorMessage(error)}`);
    return { success: false, errorMsg: 'Failed to add tech stack item' };
  }
}
