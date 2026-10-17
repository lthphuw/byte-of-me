'use server';

import type { ApiResponse } from '@byte-of-me/api-core';
import { CACHE_TAGS } from '@byte-of-me/api-core';
import { idSchema, parseInput } from '@byte-of-me/api-core/server';
import { type Company, prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import { revalidateTag } from 'next/cache';

import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';

export async function deleteCompany(id: string): Promise<ApiResponse<Company>> {
  const user = await requireAdmin();

  try {
    const parsedId = parseInput(idSchema, id);
    if (!parsedId.ok) {
      return { success: false, errorMsg: parsedId.errorMsg };
    }

    const existing = await prisma.company.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return { success: false, errorMsg: 'Company not found' };
    }

    const company = await prisma.company.delete({ where: { id } });

    revalidateTag(CACHE_TAGS.COMPANY, 'max');

    return { success: true, data: company };
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to delete company');
    logger.error(`Delete company error: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
