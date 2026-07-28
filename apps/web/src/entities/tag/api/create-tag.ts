'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import { revalidateTag } from 'next/cache';

import {
  type TagFormValues,
  tagSchema,
} from '@/entities/tag/model/tag-schema';
import type { AdminTag } from '@/entities/tag/model/types';
import { requireAdmin } from '@/shared/lib/auth';
import { CACHE_TAGS } from '@/shared/lib/constants';
import { getErrorMessage } from '@/shared/lib/utils';
import { parseInput } from '@/shared/lib/validate-action-input';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

export async function createTag(
  input: TagFormValues
): Promise<ApiResponse<AdminTag>> {
  try {
    await requireAdmin();

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
      include: { translations: true },
    });

    revalidateTag(CACHE_TAGS.TAG, 'max');

    return { success: true, data: tag };
  } catch (error) {
    const errorMsg = getErrorMessage(error);
    logger.error(`[Tag] create: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
