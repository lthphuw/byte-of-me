'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import { revalidateTag } from 'next/cache';

import type { TagFormValues } from '@/entities/tag/model/tag-schema';
import type { AdminTag } from '@/entities/tag/model/types';
import { requireAdmin } from '@/shared/lib/auth';
import { CACHE_TAGS } from '@/shared/lib/constants';
import { getErrorMessage } from '@/shared/lib/utils';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

export async function createTag(
  values: TagFormValues
): Promise<ApiResponse<AdminTag>> {
  try {
    await requireAdmin();

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
