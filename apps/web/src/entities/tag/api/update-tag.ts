'use server';

import { TagFormValues } from '@/entities/tag/schemas/tag';
import { requireUser } from '@/features/auth/lib/session';
import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

export async function updateTag(id: string, values: TagFormValues) {
  try {
    await requireUser();

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

    return { success: true };
  } catch (e: any) {
    logger.error(`[Tag] update:`, e.message);
    return { success: false, errorMsg: e.message };
  }
}
