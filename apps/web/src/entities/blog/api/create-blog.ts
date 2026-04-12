'use server';

import { prisma } from '@byte-of-me/db';

import type { BlogFormValues } from '@/entities/blog/schemas/blog';
import { requireUser } from '@/features/auth/lib/session';

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
