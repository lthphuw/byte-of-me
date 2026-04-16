'use server';

import { prisma } from '@byte-of-me/db';
import { revalidateTag } from 'next/cache';

import { CACHE_TAGS } from '@/shared/lib/constants';
import { requireUser } from '@/shared/lib/session';

export async function deleteBlog(id: string) {
  const session = await requireUser();

  try {
    const deleted = await prisma.blog.delete({
      where: {
        id,
        userId: session.id,
      },
    });

    revalidateTag(CACHE_TAGS.BLOG, 'max');

    return { success: true, data: deleted };
  } catch (error) {
    console.error('[DELETE_BLOG_ERROR]', error);
    return { success: false, error: 'Failed to delete blog post' };
  }
}
