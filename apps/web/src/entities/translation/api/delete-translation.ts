'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import { revalidatePath } from 'next/cache';

import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

export async function deleteTranslation(id: string): Promise<ApiResponse<null>> {
  try {
    await requireAdmin();

    await prisma.translation.delete({
      where: { id },
    });

    // Bust the Full Route Cache so statically rendered pages fall back to the
    // static message (the i18n query itself is uncached per request).
    revalidatePath('/', 'layout');

    return { success: true, data: null };
  } catch (error) {
    const errorMsg = getErrorMessage(error);
    logger.error(`[Translation] delete: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
