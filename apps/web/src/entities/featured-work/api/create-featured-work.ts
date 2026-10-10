'use server';

import { type FeaturedWork, prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import { revalidateTag } from 'next/cache';

import {
  type FeaturedWorkFormValues,
  featuredWorkSchema,
} from '@/entities/featured-work/model/featured-work-schema';
import { requireAdmin } from '@/shared/lib/auth';
import { CACHE_TAGS } from '@/shared/lib/constants';
import { getErrorMessage } from '@/shared/lib/utils';
import { parseInput } from '@/shared/lib/validate-action-input';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

export async function createFeaturedWork(
  input: FeaturedWorkFormValues
): Promise<ApiResponse<FeaturedWork>> {
  try {
    const user = await requireAdmin();

    const parsed = parseInput(featuredWorkSchema, input);
    if (!parsed.ok) {
      return { success: false, errorMsg: parsed.errorMsg };
    }
    const values = parsed.data;

    // The form has no order field: a new entry goes to the end of the list.
    const { _max } = await prisma.featuredWork.aggregate({
      where: { userId: user.id },
      _max: { sortOrder: true },
    });

    const featuredWork = await prisma.featuredWork.create({
      data: {
        sortOrder: (_max.sortOrder ?? -1) + 1,
        isPublished: values.isPublished,
        url: values.url || null,

        user: { connect: { id: user.id } },

        translations: {
          create: values.translations.map((t) => ({
            language: t.language,
            title: t.title,
            description: t.description || null,
          })),
        },
      },
    });

    revalidateTag(CACHE_TAGS.FEATURED_WORK, 'max');
    return { success: true, data: featuredWork };
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to create featured work');
    logger.error(`Create featured work error: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
