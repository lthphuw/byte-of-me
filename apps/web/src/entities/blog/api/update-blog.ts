'use server';

import { prisma } from '@byte-of-me/db';
import { revalidateTag } from 'next/cache';

import type { BlogFormValues } from '@/entities/blog/model/blog-schema';
import { requireAdmin } from '@/shared/lib/auth';
import { CACHE_TAGS } from '@/shared/lib/constants';





export async function updateBlog(id: string, data: BlogFormValues) {
  await requireAdmin();

  try {
    const updatedBlog = await prisma.$transaction(async (tx) => {
      const blog = await tx.blog.update({
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
      });

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

      return blog;
    });

    revalidateTag(CACHE_TAGS.BLOG, 'default');

    return { success: true, data: updatedBlog };
  } catch (error) {
    console.error('[UPDATE_BLOG_ERROR]', error);
    return { success: false, error: 'Failed to update blog post' };
  }
}
