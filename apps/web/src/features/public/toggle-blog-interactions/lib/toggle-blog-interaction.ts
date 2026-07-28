'use server';

import { prisma } from '@byte-of-me/db';
import { revalidateTag } from 'next/cache';
import { z } from 'zod';

import { requireUser } from '@/shared/lib/auth';
import { INTERACTION } from '@/shared/lib/constants';
import { idSchema, parseInput } from '@/shared/lib/validate-action-input';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

const toggleBlogInteractionSchema = z.object({
  blogId: idSchema,
  blogSlug: z.string().min(1),
  interaction: z.nativeEnum(INTERACTION),
});

export async function toggleBlogInteraction(
  blogId: string,
  blogSlug: string,
  interaction: INTERACTION
): Promise<ApiResponse<null>> {
  const user = await requireUser();

  const parsed = parseInput(toggleBlogInteractionSchema, {
    blogId,
    blogSlug,
    interaction,
  });
  if (!parsed.ok) {
    return { success: false, errorMsg: parsed.errorMsg };
  }

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

  revalidateTag(blogSlug, 'max');

  return { success: true, data: null };
}
