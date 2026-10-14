'use server';

import { type FeaturedWork, prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import { revalidateTag } from 'next/cache';

import { toLinkRows } from '@/entities/featured-work/lib/featured-work-links';
import {
  ownsAllMedia,
  toMediaRows,
} from '@/entities/featured-work/lib/featured-work-media';
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
  const user = await requireAdmin();

  try {
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

        // `media` omitted keeps the stored pair; `[]` clears it. Unlike `details`
        // (rewritten with the translations), the pair is its own table, so a caller
        // that never sends it must not lose it.
        if (values.media) {
          const mediaIds = values.media.map((m) => m.mediaId);
          if (!(await ownsAllMedia(tx, user.id, mediaIds))) {
            return { success: false, errorMsg: 'Media not found' };
          }
        }

        // `sortOrder` is deliberately untouched: only `reorderFeaturedWork` moves an entry.
        const featuredWork = await tx.featuredWork.update({
          where: { id },
          data: {
            translations: {
              deleteMany: {},
              create: values.translations.map((t) => ({
                language: t.language,
                title: t.title,
                details: t.details ?? null,
              })),
            },
          },
        });

        if (values.media) {
          // Delete, then create: a swap of the two slots reuses both unique keys.
          await tx.featuredWorkMedia.deleteMany({
            where: { featuredWorkId: id },
          });
          if (values.media.length > 0) {
            await tx.featuredWorkMedia.createMany({
              data: toMediaRows(values.media).map((row) => ({
                ...row,
                featuredWorkId: id,
              })),
            });
          }
        }

        // Same rule as the demo pair: omitted keeps the stored links, [] clears them.
        if (values.links) {
          await tx.featuredWorkLink.deleteMany({
            where: { featuredWorkId: id },
          });
          if (values.links.length > 0) {
            await tx.featuredWorkLink.createMany({
              data: toLinkRows(values.links).map((row) => ({
                ...row,
                featuredWorkId: id,
              })),
            });
          }
        }

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
