'use server';

import type { ApiResponse } from '@byte-of-me/api-core';
import { CACHE_TAGS } from '@byte-of-me/api-core';
import { parseInput } from '@byte-of-me/api-core/server';
import {
  blogFormSchema,
  type BlogFormValues,
} from '@byte-of-me/contracts/blog';
import { type Blog, prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import { revalidateTag } from 'next/cache';

import { requireAdmin } from '@/shared/lib/auth';

// Use the constants we defined

export async function createBlog(
  input: BlogFormValues
): Promise<ApiResponse<Blog>> {
  const session = await requireAdmin();

  const parsed = parseInput(blogFormSchema, input);
  if (!parsed.ok) {
    return { success: false, errorMsg: parsed.errorMsg };
  }
  const data = parsed.data;

  try {
    const newBlog = await prisma.blog.create({
      data: {
        userId: session.id,
        slug: data.slug.toLowerCase().trim(),
        publishedDate: data.publishedDate,
        isPublished: data.isPublished,
        coverImageId: data.coverImageId,

        projectId:
          !data.projectId || data.projectId === 'none' ? null : data.projectId,

        tags: {
          create:
            data.tagIds?.map((tagId) => ({
              tag: {
                connect: { id: tagId },
              },
            })) ?? [],
        },

        translations: {
          create: data.translations.map((t) => ({
            language: t.language,
            title: t.title,
            description: t.description,
            content: JSON.stringify(t.content),
          })),
        },
      },
    });

    revalidateTag(CACHE_TAGS.BLOG, 'max');

    return { success: true, data: newBlog };
  } catch (error) {
    logger.error('[CREATE_BLOG_ERROR]', { error });
    return { success: false, errorMsg: 'Failed to create blog post' };
  }
}
