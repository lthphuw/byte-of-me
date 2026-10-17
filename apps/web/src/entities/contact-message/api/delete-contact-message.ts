'use server';

import type { ApiResponse } from '@byte-of-me/api-core';
import { CACHE_TAGS } from '@byte-of-me/api-core';
import { idSchema, parseInput } from '@byte-of-me/api-core/server';
import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import { revalidateTag } from 'next/cache';

import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';

export async function deleteContactMessage(
  id: string
): Promise<ApiResponse<null>> {
  const session = await requireAdmin();

  const parsedId = parseInput(idSchema, id);
  if (!parsedId.ok) {
    return { success: false, errorMsg: parsedId.errorMsg };
  }

  try {
    await prisma.contactMessage.delete({
      where: { id, userId: session.id },
    });

    revalidateTag(CACHE_TAGS.CONTACT, 'max');

    return { success: true, data: null };
  } catch (error) {
    logger.error(`deleteContactMessage: ${getErrorMessage(error)}`);
    return { success: false, errorMsg: 'Failed to delete contact message' };
  }
}
