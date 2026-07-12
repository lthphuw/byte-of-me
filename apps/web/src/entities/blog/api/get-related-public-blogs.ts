'use server';

import { type Prisma, prisma } from '@byte-of-me/db';

import type { PublicBlog } from '@/entities/blog/model/types';
import { handlePublicAction, withPublicActionHandler } from '@/shared/api';
import { CACHE_TAGS } from '@/shared/lib/constants';
import { getTranslatedContent } from '@/shared/lib/i18n-utils';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

/**
 * Published blogs that share at least one tag with the given blog, newest
 * first, excluding the blog itself. Powers the "related posts" section on the
 * blog detail page.
 */
export async function getRelatedPublicBlogs(
  blogId: string,
  tagSlugs: string[],
  limit: number = 3
): Promise<ApiResponse<PublicBlog[]>> {
  return handlePublicAction('getRelatedPublicBlogs', async () => {
    return await withPublicActionHandler(
      'getRelatedPublicBlogs',
      async ({ locale }) => {
        if (tagSlugs.length === 0) return [];

        const where: Prisma.BlogWhereInput = {
          isPublished: true,
          id: { not: blogId },
          tags: { some: { tag: { slug: { in: tagSlugs } } } },
        };

        const blogsRes = await prisma.blog.findMany({
          where,
          orderBy: { publishedDate: 'desc' },
          take: limit,
          include: {
            translations: true,
            coverImage: true,
            tags: { include: { tag: { include: { translations: true } } } },
            _count: { select: { blogViewLogs: true } },
          },
        });

        return blogsRes.map((blog): PublicBlog => {
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
            content: '',
            coverImage: blog.coverImage,
            readingTime: blog.readingTime,
            views: blog._count.blogViewLogs,
            avgReadingTime: blog.readingTime ?? 0,
            tags: blog.tags.map(({ tag }) => {
              const t = getTranslatedContent(tag.translations, locale);
              return { ...tag, name: t?.name || '' };
            }),
          };
        });
      },
      {
        cache: true,
        cacheKey: ['related-public-blogs', blogId, ...tagSlugs],
        cacheTags: [CACHE_TAGS.BLOG],
      }
    );
  });
}
