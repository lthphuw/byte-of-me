'use server';

import { type Company, prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import { revalidateTag } from 'next/cache';

import { requireAdmin } from '@/shared/lib/auth';
import { CACHE_TAGS } from '@/shared/lib/constants';
import { getErrorMessage } from '@/shared/lib/utils';
import { idSchema, parseInput } from '@/shared/lib/validate-action-input';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

export async function deleteCompany(id: string): Promise<ApiResponse<Company>> {
  try {
    const user = await requireAdmin();

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
