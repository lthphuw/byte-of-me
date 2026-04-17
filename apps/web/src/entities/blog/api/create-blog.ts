'use server';

import { prisma } from '@byte-of-me/db';
import { revalidateTag } from 'next/cache';

import type { BlogFormValues } from '@/entities/blog/model/blog-schema';
import { CACHE_TAGS } from '@/shared/lib/constants';
import { requireUser } from '@/shared/lib/session';





// Use the constants we defined

export async function createBlog(data: BlogFormValues) {
  const session = await requireUser();

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
          create: data.translations as Any,
        },
      },
    });

    revalidateTag(CACHE_TAGS.BLOG, 'max');

    return { success: true, data: newBlog };
  } catch (error) {
    console.error('[CREATE_BLOG_ERROR]', error);
    return { success: false, error: 'Failed to create blog post' };
  }
}
