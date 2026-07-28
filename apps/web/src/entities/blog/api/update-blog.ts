'use server';

import { type Blog, prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import { revalidateTag } from 'next/cache';

import {
  blogFormSchema,
  type BlogFormValues,
} from '@/entities/blog/model/blog-schema';
import { requireAdmin } from '@/shared/lib/auth';
import { CACHE_TAGS } from '@/shared/lib/constants';
import { idSchema, parseInput } from '@/shared/lib/validate-action-input';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

export async function updateBlog(
  id: string,
  input: BlogFormValues
): Promise<ApiResponse<Blog>> {
  await requireAdmin();

  const parsedId = parseInput(idSchema, id);
  if (!parsedId.ok) {
    return { success: false, errorMsg: parsedId.errorMsg };
  }
  const parsed = parseInput(blogFormSchema, input);
  if (!parsed.ok) {
    return { success: false, errorMsg: parsed.errorMsg };
  }
  const data = parsed.data;

  try {
    const updatedBlog = await prisma.$transaction(async (tx) => {
      // Delete-and-recreate the translations; the two steps are ordered, but
      // the pair is independent of the blog row update below.
      const replaceTranslations = async () => {
        await tx.blogTranslation.deleteMany({
          where: { blogId: id },
        });

        await tx.blogTranslation.createMany({
          data: data.translations.map((t) => ({
            blogId: id,
            language: t.language,
            title: t.title,
            description: t.description ?? null,
            content: t.content,
          })),
        });
      };

      const [blog] = await Promise.all([
        tx.blog.update({
          where: { id },
          data: {
            slug: data.slug.toLowerCase().trim(),
            publishedDate: data.publishedDate,
            isPublished: data.isPublished,
            coverImageId: data.coverImageId ?? null,
            projectId:
              !data.projectId || data.projectId === 'none'
                ? null
                : data.projectId,

            tags: {
              deleteMany: {},
              create:
                data.tagIds?.map((tagId) => ({
                  tag: {
                    connect: { id: tagId },
                  },
                })) ?? [],
            },
          },
        }),
        replaceTranslations(),
      ]);

      return blog;
    });

    revalidateTag(CACHE_TAGS.BLOG, 'default');

    return { success: true, data: updatedBlog };
  } catch (error) {
    logger.error('[UPDATE_BLOG_ERROR]', { error });
    return { success: false, errorMsg: 'Failed to update blog post' };
  }
}
