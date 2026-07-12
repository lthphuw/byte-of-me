'use server';

import { prisma } from '@byte-of-me/db';
import { revalidateTag } from 'next/cache';

import { requireAdmin } from '@/shared/lib/auth';
import { CACHE_TAGS } from '@/shared/lib/constants';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

export async function deleteProject(id: string): Promise<ApiResponse<null>> {
  await requireAdmin();
  await prisma.project.delete({ where: { id } });
  revalidateTag(CACHE_TAGS.PROJECT, 'max');

  return { success: true, data: null };
}
