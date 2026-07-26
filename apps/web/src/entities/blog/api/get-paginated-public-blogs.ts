'use server';

import { type Prisma, prisma } from '@byte-of-me/db';

import type { PublicBlog } from '@/entities/blog/model/types';
import type { PublicProject } from '@/entities/project/model/types';
import { handlePublicAction, withPublicActionHandler } from '@/shared/api';
import { getAuthenticatedAdmin } from '@/shared/lib/auth';
import { getTranslatedContent } from '@/shared/lib/i18n-utils';
import { buildPaginatedMeta } from '@/shared/lib/pagination';
import type { ApiResponse } from '@/shared/types/api/api-response.type';
import type {
  PaginatedData,
  PaginatedParams,
} from '@/shared/types/api/paginated-api.type';

export type GetPublicBlogsParams = PaginatedParams & {
  tagSlugs?: string[];
  search?: string;
  /**
   * Also return unpublished posts. The flag alone grants nothing — the
   * session is re-checked server-side and non-admins get published-only
   * results regardless of what the client sends.
   */
  includeDrafts?: boolean;
};

export async function getPaginatedPublicBlogs(
  params: GetPublicBlogsParams
): Promise<ApiResponse<PaginatedData<PublicBlog>>> {
  return handlePublicAction('getPaginatedPublicBlogs', async () => {
    return await withPublicActionHandler(
      'getPaginatedPublicBlogs',
      async ({ locale }) => {
        const {
          page = 1,
          limit = 9,
          tagSlugs = [],
          search,
          includeDrafts,
        } = params;
        const skip = (page - 1) * limit;

        const admin = includeDrafts ? await getAuthenticatedAdmin() : null;
        const where: Prisma.BlogWhereInput = admin
          ? {}
          : { isPublished: true };

        if (tagSlugs.length > 0) {
          where.AND = tagSlugs.map((slug) => ({
            tags: { some: { tag: { slug } } },
          }));
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
              id: blog.project.id,
              slug: blog.project.slug,
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
            views: blog._count.blogViewLogs,
            avgReadingTime: blog.readingTime ?? 0,
            tags: blog.tags.map(({ tag }) => {
              const t = getTranslatedContent(tag.translations, locale);
              return { ...tag, name: t?.name || '' };
            }),
          };
        });

        return {
          data: blogs,
          meta: buildPaginatedMeta({ page, limit, totalCount: total }),
        };
      },
      { cache: false }
    );
  });
}
