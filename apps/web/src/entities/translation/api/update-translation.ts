'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import { revalidatePath } from 'next/cache';

import type { TranslationFormValues } from '@/entities/translation/model/translation-schema';
import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

export async function updateTranslation(
  id: string,
  values: TranslationFormValues
): Promise<ApiResponse<null>> {
  try {
    await requireAdmin();

    await prisma.translation.update({
      where: { id },
      data: {
        sourceText: values.key,
        language: values.language,
        translated: values.value,
      },
    });

    // Bust the Full Route Cache so statically rendered pages pick up the
    // updated override (the i18n query itself is uncached per request).
    revalidatePath('/', 'layout');

    return { success: true, data: null };
  } catch (error) {
    const errorMsg = getErrorMessage(error);
    logger.error(`[Translation] update: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
