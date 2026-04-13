'use server';

import { requireUser } from '@/features/auth/lib/session';

import { prisma } from '@byte-of-me/db';

export async function deleteProject(id: string) {
  await requireUser();
  await prisma.project.delete({ where: { id } });
  return { success: true };
}
