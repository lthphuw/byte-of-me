'use server';

import { prisma } from '@byte-of-me/db';
import { revalidatePath, revalidateTag } from 'next/cache';

import { requireUser } from '@/shared/lib/auth';
import type { INTERACTION } from '@/shared/lib/constants';





export async function toggleBlogInteraction(
  blogId: string,
  blogSlug: string,
  interaction: INTERACTION
) {
  const user = await requireUser();

  const existingLike = await prisma.interaction.findUnique({
    where: {
      userId_blogId_type: {
        userId: user.id,
        blogId: blogId,
        type: interaction,
      },
    },
  });

  if (existingLike) {
    await prisma.interaction.delete({
      where: { id: existingLike.id },
    });
  } else {
    await prisma.interaction.create({
      data: {
        userId: user.id,
        blogId: blogId,
        type: interaction,
      },
    });
  }

  revalidatePath(`/blogs/${blogSlug}`);
  revalidateTag(blogSlug, 'max');

  return { success: true };
}
