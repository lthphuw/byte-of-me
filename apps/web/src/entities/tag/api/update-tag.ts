'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import { revalidateTag } from 'next/cache';

import type { TagFormValues } from '@/entities/tag/model/tag-schema';
import { requireAdmin } from '@/shared/lib/auth';
import { CACHE_TAGS } from '@/shared/lib/constants';





export async function updateTag(id: string, values: TagFormValues) {
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

    return { success: true };
  } catch (e: Any) {
    logger.error(`[Tag] update:`, e.message);
    return { success: false, errorMsg: e.message };
  }
}
