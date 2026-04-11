'use server';

import { prisma } from '@byte-of-me/db';

export async function deleteBlog(id: string) {
  return prisma.blog.delete({ where: { id } });
}
