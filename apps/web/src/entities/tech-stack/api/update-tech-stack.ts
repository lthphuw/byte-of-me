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
import { idSchema, parseInput } from '@/shared/lib/validate-action-input';
import type { ApiResponse } from '@/shared/types/api/api-response.type';


export async function updateTechStack(
  id: string,
  input: TechStackFormValues
): Promise<ApiResponse<AdminTechStack>> {
  try {
    const user = await requireAdmin();

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
        ...data,
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

    revalidateTag(CACHE_TAGS.TECH, 'default');

    return { success: true, data: updatedRecord };
  } catch (error) {
    logger.error(`updateTechStack: ${getErrorMessage(error)}`);
    return { success: false, errorMsg: 'Failed to update tech stack' };
  }
}
