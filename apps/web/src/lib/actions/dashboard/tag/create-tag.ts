'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import { requireUser } from '@/lib/auth/session';
import { TagFormValues } from '@/lib/schemas/tag.schema';

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
