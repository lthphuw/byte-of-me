'use server';

import { type Prisma, prisma } from '@byte-of-me/db';

import type { PublicBlog } from '@/entities/blog/model/types';
import type { PublicProject } from '@/entities/project/model/types';
// Direct submodule import, not the `@/shared/api` barrel: that barrel also
// re-exports `./mailer` and `./s3-storage-api`, which construct a nodemailer
// transport and an S3 client at module scope. Pulling those in eagerly for
// every caller of this action is the same barrel-eagerness hazard already
// fixed once for `@byte-of-me/ui` (see the `cn` re-export in
// `@/shared/lib/utils`) — same fix here: import the file this action
// actually needs, directly.
import {
  handlePublicAction,
  withPublicActionHandler,
} from '@/shared/api/public-action-template';
import { getAuthenticatedAdmin } from '@/shared/lib/auth';
import { CACHE_TAGS } from '@/shared/lib/constants';
import {
  getTranslatedContent,
  getTranslationLanguages,
} from '@/shared/lib/i18n-utils';
import { buildPaginatedMeta, clampPagination } from '@/shared/lib/pagination';
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
    const { tagSlugs = [], search, includeDrafts } = params;
    const { page, limit } = clampPagination(params, { defaultLimit: 9 });

    return await withPublicActionHandler(
      'getPaginatedPublicBlogs',
      async ({ locale }) => {
        const skip = (page - 1) * limit;

        const admin = includeDrafts ? await getAuthenticatedAdmin() : null;
        const where: Prisma.BlogWhereInput = admin ? {} : { isPublished: true };

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

        // List cards never render the article body, so BlogTranslation.content
        // (a full @db.Text column) is deliberately not selected here.
        const languages = { in: getTranslationLanguages(locale) };
        const [blogsRes, total] = await Promise.all([
          prisma.blog.findMany({
            where,
            orderBy: { publishedDate: 'desc' },
            skip,
            take: limit,
            include: {
              translations: {
                where: { language: languages },
                select: { language: true, title: true, description: true },
              },
              coverImage: true,
              project: {
                include: {
                  translations: {
                    where: { language: languages },
                    select: { language: true, title: true, description: true },
                  },
                },
              },
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
            // Not fetched for lists; the detail action loads the full body.
            content: '',
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
      {
        // The draft-inclusive branch depends on the caller's session, so its
        // result must never be shared: only the anonymous, published-only
        // branch is cached. The key mirrors every closure argument the query
        // depends on (locale is appended by the handler).
        cache: !includeDrafts,
        cacheKey: [
          'paginated-public-blogs',
          String(page),
          String(limit),
          search ?? '',
          tagSlugs.join(','),
        ],
        cacheTags: [CACHE_TAGS.BLOG],
      }
    );
  });
}
