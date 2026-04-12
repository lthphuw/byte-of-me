'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import type { TagFormValues } from '@/entities/tag/schemas/tag';
import { requireUser } from '@/features/auth/lib/session';

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

    return { success: true, data: tag };
  } catch (e: any) {
    logger.error(`[Tag] create:`, e.message);
    return { success: false, errorMsg: e.message };
  }
}
