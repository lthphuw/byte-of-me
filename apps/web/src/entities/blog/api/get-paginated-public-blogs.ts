'use server';

import { prisma } from '@byte-of-me/db';

import type { PublicProject } from '@/entities';
import type { PublicBlog } from '@/entities/blog/model/types';
import {
  handlePublicAction,
  withPublicActionHandler,
} from '@/shared/api/public-action-template';
import { getTranslatedContent } from '@/shared/lib/i18n-utils';
import type { ApiResponse } from '@/shared/types/api/api-response.type';
import type {
  PaginatedData,
  PaginatedParams,
} from '@/shared/types/api/paginated-api.type';

export type GetPublicBlogsParams = PaginatedParams & {
  tagSlugs?: string[];
  search?: string;
};

export async function getPaginatedPublicBlogs(
  params: GetPublicBlogsParams
): Promise<ApiResponse<PaginatedData<PublicBlog>>> {
  return handlePublicAction('getPaginatedPublicBlogs', async () => {
    return await withPublicActionHandler(
      'getPaginatedPublicBlogs',
      async ({ locale }) => {
        const { page = 1, limit = 9, tagSlugs = [], search } = params;
        const skip = (page - 1) * limit;

        const where: Any = {
          isPublished: true,
          AND: [],
        };

        if (tagSlugs.length > 0) {
          tagSlugs.forEach((slug) => {
            where.AND.push({
              tags: { some: { tag: { slug } } },
            });
          });
        }

        if (search) {
          where.translations = {
            some: {
              OR: [
                { title: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
              ],
            },
          };
        }

        if (where.AND.length === 0) delete where.AND;

        const [blogsRes, total] = await Promise.all([
          prisma.blog.findMany({
            where,
            orderBy: { publishedDate: 'desc' },
            skip,
            take: limit,
            include: {
              translations: true,
              coverImage: true,
              project: { include: { translations: true } },
              tags: {
                include: {
                  tag: { include: { translations: true } },
                },
              },
              _count: { select: { blogViewLogs: true } },
            },
          }),
          prisma.blog.count({ where }),
        ]);



        const blogs: PublicBlog[] = blogsRes.map((blog) => {
          const translated = getTranslatedContent(blog.translations, locale);

          let project: Nullable<Partial<PublicProject>> = null;
          if (blog.project) {
            const projTranslated = getTranslatedContent(
              blog.project.translations,
              locale
            );

            project = {
              id: blog.id,
              slug: blog.slug,
              title: projTranslated?.title || '',
              description: projTranslated?.description || '',
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
            project,
            coverImage: blog.coverImage,
            readingTime: blog.readingTime,
            tags: blog.tags.map(({ tag }) => {
              const t = getTranslatedContent(tag.translations, locale);
              return { ...tag, name: t?.name || '' };
            }),
          };
        });

        return {
          data: blogs,
          meta: {
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            totalCount: total,
            hasMore: page < Math.ceil(total / limit),
          },
        };
      },
      { cache: false }
    );
  });
}
