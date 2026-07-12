'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import { revalidateTag } from 'next/cache';

import type { TagFormValues } from '@/entities/tag/model/tag-schema';
import { requireAdmin } from '@/shared/lib/auth';
import { CACHE_TAGS } from '@/shared/lib/constants';
import { getErrorMessage } from '@/shared/lib/utils';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

export async function updateTag(
  id: string,
  values: TagFormValues
): Promise<ApiResponse<null>> {
  try {
    await requireAdmin();

    await prisma.tag.update({
      where: { id },
      data: {
        slug: values.slug,
        translations: {
          deleteMany: {},
          create: values.translations,
        },
      },
    });

    revalidateTag(CACHE_TAGS.TAG, 'max');

    return { success: true, data: null };
  } catch (error) {
    const errorMsg = getErrorMessage(error);
    logger.error(`[Tag] update: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
