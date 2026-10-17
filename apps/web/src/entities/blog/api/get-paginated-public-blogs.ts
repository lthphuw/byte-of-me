'use server';

import type {
  ApiResponse,
  PaginatedData,
  PaginatedParams,
} from '@byte-of-me/api-core';
import {
  buildPaginatedMeta,
  CACHE_TAGS,
  clampPagination,
  getTranslatedContent,
  getTranslationLanguages,
  MAX_CACHED_PAGE,
} from '@byte-of-me/api-core';
import { parseInput } from '@byte-of-me/api-core/server';
import { type Prisma, prisma } from '@byte-of-me/db';

import { publicBlogsParamsSchema } from '@/entities/blog/model/blog-schema';
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
import { PUBLIC_MEDIA_SELECT } from '@/shared/lib/public-media';

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
  const parsed = parseInput(
    publicBlogsParamsSchema,
    params,
    'getPaginatedPublicBlogs'
  );
  if (!parsed.ok) {
    return { success: false, errorMsg: parsed.errorMsg };
  }

  return handlePublicAction('getPaginatedPublicBlogs', async () => {
    const { tagSlugs = [], search, includeDrafts } = parsed.data;
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
              coverImage: { select: PUBLIC_MEDIA_SELECT },
              // `isPublished` is read only to gate the mapper below: a post
              // may link to a draft project, which must not reach a visitor.
              project: {
                select: {
                  id: true,
                  slug: true,
                  isPublished: true,
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
          if (blog.project?.isPublished) {
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
        // branch is cached. Free-text searches, tag filters and deep pages are
        // read live: each distinct tuple would otherwise store its own (mostly
        // empty) entry, and the slugs are caller-chosen. The key mirrors every closure argument the query depends on
        // (locale is appended by the handler).
        cache:
          !includeDrafts &&
          !search &&
          tagSlugs.length === 0 &&
          page <= MAX_CACHED_PAGE,
        cacheKey: [
          'paginated-public-blogs',
          String(page),
          String(limit),
          search ?? '',
          // JSON, not `join(',')`: a comma in a slug would share a key.
          JSON.stringify(tagSlugs),
        ],
        cacheTags: [CACHE_TAGS.BLOG],
      }
    );
  });
}
