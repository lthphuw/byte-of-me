'use server';

import type { PublicBlog } from '@/entities/blog/model/types';
import type { PublicProject } from '@/entities/project/model/types';
import {
  handlePublicAction,
  withPublicActionHandler,
} from '@/shared/api/public-action-template';
import { getTranslatedContent } from '@/shared/lib/i18n-utils';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

import { prisma } from '@byte-of-me/db';

export async function getPublicBlogBySlug(
  slug: string
): Promise<ApiResponse<PublicBlog>> {
  if (!slug) {
    return { success: false, errorMsg: 'Slug is required' };
  }

  return handlePublicAction('getPublicBlogBySlug', async () => {
    return await withPublicActionHandler(
      'getPublicBlogBySlug',
      async ({ locale }) => {
        const blog = await prisma.blog.findUniqueOrThrow({
          where: { slug, isPublished: true },
          include: {
            translations: true,
            coverImage: true,
            tags: { include: { tag: { include: { translations: true } } } },
            project: { include: { translations: true } },
          },
        });

        const translated = getTranslatedContent(blog.translations, locale);
        let project: Maybe<PublicProject> = null;

        if (blog.project) {
          const blogTranslated = getTranslatedContent(
            blog.project.translations,
            locale
          );

          project = {
            id: blog.project.id,
            createdAt: blog.project.createdAt,
            updatedAt: blog.project.updatedAt,
            slug: blog.project.slug,
            githubLink: blog.project.githubLink,
            liveLink: blog.project.liveLink,
            startDate: blog.project.startDate,
            endDate: blog.project.endDate,
            isPublished: blog.project.isPublished,

            title: blogTranslated?.title || '',
            description: blogTranslated?.description || '',

            techStacks: [],
            tags: [],
          };
        }

        return {
          id: blog.id,
          createdAt: blog.createdAt,
          updatedAt: blog.updatedAt,

          slug: blog.slug,

          isPublished: blog.isPublished,
          publishedDate: blog.publishedDate,

          title: translated?.title || '',
          description: translated?.description || '',
          content: translated?.content || '',

          project: project,
          coverImage: blog.coverImage,

          readingTime: blog.readingTime,

          tags: blog.tags.map(({ tag }) => {
            const t = getTranslatedContent(tag.translations, locale);

            return {
              id: tag.id,
              createdAt: tag.createdAt,
              updatedAt: tag.updatedAt,

              slug: tag.slug,
              name: t?.name || '',
            };
          }),
        };
      },
      {
        cache: true,
        cacheKey: ['blog'],
        cacheTags: ['blog', slug],
      }
    );
  });
}
