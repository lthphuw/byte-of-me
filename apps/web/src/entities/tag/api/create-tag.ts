'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import { revalidateTag } from 'next/cache';

import type { TagFormValues } from '@/entities/tag/model/tag-schema';
import { CACHE_TAGS } from '@/shared/lib/constants';
import { requireUser } from '@/shared/lib/session';

export async function createTag(values: TagFormValues) {
  try {
    await requireUser();

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
  } catch (e: any) {
    logger.error(`[Tag] create:`, e.message);
    return { success: false, errorMsg: e.message };
  }
}
