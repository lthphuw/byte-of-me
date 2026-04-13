'use server';

import type { BlogFormValues } from '@/entities/blog/model/blog-schema';

import { prisma } from '@byte-of-me/db';

export async function updateBlog(id: string, data: BlogFormValues) {
  return await prisma.$transaction(async (tx) => {
    const blog = await tx.blog.update({
      where: { id },
      data: {
        slug: data.slug,
        publishedDate: data.publishedDate,
        isPublished: data.isPublished,

        coverImageId: data.coverImageId ?? null,
        projectId:
          data.projectId === '' || data.projectId === 'none'
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
}
