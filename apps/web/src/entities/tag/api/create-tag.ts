'use server';

import type { ApiResponse } from '@byte-of-me/api-core';
import { parseInput } from '@byte-of-me/api-core/server';
import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import { revalidateTag } from 'next/cache';

import { TAG_MUTATION_TAGS } from '@/entities/tag/model/revalidation';
import { type TagFormValues, tagSchema } from '@/entities/tag/model/tag-schema';
import type { AdminTag } from '@/entities/tag/model/types';
import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';

export async function createTag(
  input: TagFormValues
): Promise<ApiResponse<AdminTag>> {
  await requireAdmin();

  try {
    const parsed = parseInput(tagSchema, input);
    if (!parsed.ok) {
      return { success: false, errorMsg: parsed.errorMsg };
    }
    const values = parsed.data;

    const tag = await prisma.tag.create({
      data: {
        slug: values.slug,
        translations: {
          create: values.translations,
        },
      },
      include: {
        translations: {
          select: {
            id: true,
            language: true,
            name: true,
          },
        },
      },
    });

    for (const tagName of TAG_MUTATION_TAGS) revalidateTag(tagName, 'max');

    return { success: true, data: tag };
  } catch (error) {
    const errorMsg = getErrorMessage(error);
    logger.error(`[Tag] create: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
