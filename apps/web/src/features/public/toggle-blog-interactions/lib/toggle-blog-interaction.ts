'use server';

import { prisma } from '@byte-of-me/db';
import { revalidateTag } from 'next/cache';
import { z } from 'zod';

import { requireUser } from '@/shared/lib/auth';
import { INTERACTION } from '@/shared/lib/constants';
import { checkRateLimit } from '@/shared/lib/rate-limit';
import { idSchema, parseInput } from '@/shared/lib/validate-action-input';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

const toggleBlogInteractionSchema = z.object({
  blogId: idSchema,
  interaction: z.nativeEnum(INTERACTION),
});

export async function toggleBlogInteraction(
  blogId: string,
  // Ignored, kept for callers: a caller's slug would let any signed-in visitor
  // purge any cache tag. The tag revalidated below comes from the blog row.
  _blogSlug: string,
  interaction: INTERACTION
): Promise<ApiResponse<null>> {
  const user = await requireUser();

  const parsed = parseInput(toggleBlogInteractionSchema, {
    blogId,
    interaction,
  });
  if (!parsed.ok) {
    return { success: false, errorMsg: parsed.errorMsg };
  }

  const { allowed } = await checkRateLimit({
    key: `interaction:${user.id}`,
    limit: 20,
    windowSec: 60,
  });
  if (!allowed) {
    return {
      success: false,
      errorMsg: 'Too many requests. Please try again in a minute.',
    };
  }

  const blog = await prisma.blog.findUnique({
    where: { id: parsed.data.blogId },
    select: { slug: true, isPublished: true },
  });
  if (!blog?.isPublished) {
    return { success: false, errorMsg: 'Blog not found' };
  }

  const existingLike = await prisma.interaction.findUnique({
    where: {
      userId_blogId_type: {
        userId: user.id,
        blogId: parsed.data.blogId,
        type: parsed.data.interaction,
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
        blogId: parsed.data.blogId,
        type: parsed.data.interaction,
      },
    });
  }

  // `getPublicBlogBySlug` tags its cache entry with this slug.
  revalidateTag(blog.slug, 'max');

  return { success: true, data: null };
}
