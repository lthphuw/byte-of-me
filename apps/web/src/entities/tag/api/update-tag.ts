'use server';

import type { ApiResponse } from '@byte-of-me/api-core';
import { idSchema, parseInput } from '@byte-of-me/api-core/server';
import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import { revalidateTag } from 'next/cache';

import { TAG_MUTATION_TAGS } from '@/entities/tag/model/revalidation';
import { type TagFormValues, tagSchema } from '@/entities/tag/model/tag-schema';
import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';

export async function updateTag(
  id: string,
  input: TagFormValues
): Promise<ApiResponse<null>> {
  await requireAdmin();

  try {
    const parsedId = parseInput(idSchema, id);
    if (!parsedId.ok) {
      return { success: false, errorMsg: parsedId.errorMsg };
    }
    const parsed = parseInput(tagSchema, input);
    if (!parsed.ok) {
      return { success: false, errorMsg: parsed.errorMsg };
    }
    const values = parsed.data;

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

    for (const tagName of TAG_MUTATION_TAGS) revalidateTag(tagName, 'max');

    return { success: true, data: null };
  } catch (error) {
    const errorMsg = getErrorMessage(error);
    logger.error(`[Tag] update: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
