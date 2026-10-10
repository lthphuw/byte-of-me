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
import { idSchema, parseInput } from '@/shared/lib/validate-action-input';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

export async function updateFeaturedWork(
  id: string,
  input: FeaturedWorkFormValues
): Promise<ApiResponse<FeaturedWork>> {
  try {
    const user = await requireAdmin();

    const parsedId = parseInput(idSchema, id);
    if (!parsedId.ok) {
      return { success: false, errorMsg: parsedId.errorMsg };
    }
    const parsed = parseInput(featuredWorkSchema, input);
    if (!parsed.ok) {
      return { success: false, errorMsg: parsed.errorMsg };
    }
    const values = parsed.data;

    const result = await prisma.$transaction(
      async (tx): Promise<ApiResponse<FeaturedWork>> => {
        const existing = await tx.featuredWork.findFirst({
          where: { id, userId: user.id },
          select: { id: true },
        });

        if (!existing) {
          return { success: false, errorMsg: 'Featured work not found' };
        }

        // `sortOrder` is deliberately untouched: only `reorderFeaturedWork` moves an entry.
        const featuredWork = await tx.featuredWork.update({
          where: { id },
          data: {
            isPublished: values.isPublished,
            url: values.url || null,

            translations: {
              deleteMany: {},
              create: values.translations.map((t) => ({
                language: t.language,
                title: t.title,
                description: t.description || null,
                details: t.details ?? null,
              })),
            },
          },
        });

        return { success: true, data: featuredWork };
      }
    );

    // Revalidate only after the transaction has committed, so readers never
    // repopulate the cache from uncommitted (or rolled-back) state.
    if (result.success) {
      revalidateTag(CACHE_TAGS.FEATURED_WORK, 'max');
    }

    return result;
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to update featured work');
    logger.error(`Update featured work error: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
