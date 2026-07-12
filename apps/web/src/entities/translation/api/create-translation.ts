'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import { revalidatePath } from 'next/cache';

import type { TranslationFormValues } from '@/entities/translation/model/translation-schema';
import type { AdminTranslation } from '@/entities/translation/model/types';
import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

export async function createTranslation(
  values: TranslationFormValues
): Promise<ApiResponse<AdminTranslation>> {
  try {
    await requireAdmin();

    const translation = await prisma.translation.create({
      data: {
        sourceText: values.key,
        language: values.language,
        translated: values.value,
      },
    });

    // request.ts queries translations per request (no unstable_cache), but
    // statically rendered routes bake messages into the Full Route Cache, so
    // bust every route for the override to show up without a redeploy.
    revalidatePath('/', 'layout');

    return { success: true, data: translation };
  } catch (error) {
    const errorMsg = getErrorMessage(error);
    logger.error(`[Translation] create: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
