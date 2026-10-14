'use server';

import { prisma } from '@byte-of-me/db';

import { readBodyImageSizes } from '@/entities/blog/lib/read-image-sizes';
import type { PublicBlog } from '@/entities/blog/model/types';
import { handlePublicAction, withPublicActionHandler } from '@/shared/api';
import { CACHE_TAGS } from '@/shared/lib/constants';
import {
  getTranslatedContent,
  getTranslationLanguages,
} from '@/shared/lib/i18n-utils';
import { PUBLIC_MEDIA_SELECT } from '@/shared/lib/public-media';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

// The dashboard's slug field has no upper bound, so a title-derived slug can
// run past the 64 characters the filter chips allow; this only has to keep an
// absurd value out of the cache key and tag.
const MAX_BLOG_SLUG_LENGTH = 200;

export async function getPublicBlogBySlug(
  slug: string
): Promise<ApiResponse<PublicBlog>> {
  // Before the slug becomes a cache key and tag: an oversized (or non-string)
  // value would otherwise be stored as both. Answered like a missing post.
  if (
    typeof slug !== 'string' ||
    slug.length === 0 ||
    slug.length > MAX_BLOG_SLUG_LENGTH
  ) {
    return { success: false, errorMsg: 'Blog not found' };
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
            coverImage: { select: PUBLIC_MEDIA_SELECT },
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
        const imageSizes = await readBodyImageSizes(translated?.content);
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
          imageSizes,

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
        // `image-sizes`: entries cached before the body carried its image sizes lack them.
        cacheKey: [CACHE_TAGS.BLOG, slug, 'image-sizes'],
        cacheTags: [CACHE_TAGS.BLOG, slug],
      }
    );
  });
}
