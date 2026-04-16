'use server';

import { prisma } from '@byte-of-me/db';
import { revalidateTag } from 'next/cache';

import { CACHE_TAGS } from '@/shared/lib/constants';
import { requireUser } from '@/shared/lib/session';

export async function deleteProject(id: string) {
  await requireUser();
  await prisma.project.delete({ where: { id } });
  revalidateTag(CACHE_TAGS.PROJECT, 'max');

  return { success: true };
}
