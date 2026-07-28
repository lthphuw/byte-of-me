'use server';

import { prisma } from '@byte-of-me/db';

import type { PublicBlog } from '@/entities/blog/model/types';
import { handlePublicAction, withPublicActionHandler } from '@/shared/api';
import { CACHE_TAGS } from '@/shared/lib/constants';
import {
  getTranslatedContent,
  getTranslationLanguages,
} from '@/shared/lib/i18n-utils';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

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
        // The detail page renders the full article body, so all translation
        // fields stay selected — but only for the locale (+ 'en' fallback).
        const languages = { in: getTranslationLanguages(locale) };
        const blog = await prisma.blog.findUniqueOrThrow({
          where: { slug, isPublished: true },
          include: {
            translations: { where: { language: languages } },
            coverImage: true,
            tags: {
              include: {
                tag: {
                  include: {
                    translations: {
                      where: { language: languages },
                      select: { language: true, name: true },
                    },
                  },
                },
              },
            },
            user: { select: { name: true, image: true } },
          },
        });

        const translated = getTranslatedContent(blog.translations, locale);
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

          projectId: blog.projectId,
          coverImage: blog.coverImage,

          readingTime: blog.readingTime,

          author: {
            name: blog.user?.name || '',
            avatar: blog.user?.image,
          },

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
        cacheKey: [CACHE_TAGS.BLOG, slug],
        cacheTags: [CACHE_TAGS.BLOG, slug],
      }
    );
  });
}
