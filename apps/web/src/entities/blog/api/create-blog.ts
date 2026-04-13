'use server';

import type { BlogFormValues } from '@/entities/blog/model/blog-schema';
import { requireUser } from '@/features/auth/lib/session';

import { prisma } from '@byte-of-me/db';

export async function createBlog(data: BlogFormValues) {
  const session = await requireUser();

  return prisma.blog.create({
    data: {
      userId: session.id,
      slug: data.slug,
      publishedDate: data.publishedDate,
      isPublished: data.isPublished,

      coverImageId: data.coverImageId,
      projectId:
        data.projectId === '' || data.projectId === 'none'
          ? null
          : data.projectId,

      tags: {
        create:
          data.tagIds?.map((tagId) => ({
            tag: {
              connect: { id: tagId },
            },
          })) ?? [],
      },

      translations: {
        create: data.translations as any,
      },
    },
  });
}
