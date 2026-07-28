'use server';

import { type Prisma, prisma } from '@byte-of-me/db';
import { richTextToPlainText } from '@byte-of-me/ui/lib/rich-text-content';
import { renderRichTextHtml } from '@byte-of-me/ui/rich-text-render';

import type { PublicProject } from '@/entities/project/model/types';
import { handlePublicAction, withPublicActionHandler } from '@/shared/api';
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

export type GetPublicProjectsParams = PaginatedParams & {
  tagSlugs?: string[];
  techStackSlugs?: string[];
  search?: string;
};

export async function getPaginatedPublicProjects(
  params: GetPublicProjectsParams
): Promise<ApiResponse<PaginatedData<PublicProject>>> {
  return handlePublicAction('getPaginatedPublicProjects', async () => {
    const { tagSlugs = [], techStackSlugs = [], search } = params;
    const { page, limit } = clampPagination(params, { defaultLimit: 9 });

    return await withPublicActionHandler(
      'getPaginatedPublicProjects',
      async ({ userId, locale }) => {
        const skip = (page - 1) * limit;

        const filterConditions: Prisma.ProjectWhereInput[] = [
          ...tagSlugs.map((slug) => ({
            tags: { some: { tag: { slug } } },
          })),
          ...techStackSlugs.map((slug) => ({
            techStacks: { some: { techStack: { slug } } },
          })),
        ];

        const where: Prisma.ProjectWhereInput = {
          userId,
          isPublished: true,
        };

        if (filterConditions.length > 0) {
          where.AND = filterConditions;
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

        const [projectsRes, total] = await Promise.all([
          prisma.project.findMany({
            where,
            orderBy: { startDate: 'desc' },
            skip,
            take: limit,

            include: {
              translations: {
                where: { language: { in: getTranslationLanguages(locale) } },
                select: { language: true, title: true, description: true },
              },

              techStacks: {
                include: {
                  techStack: {
                    include: {
                      logo: true,
                    },
                  },
                },
              },

              tags: {
                include: {
                  tag: {
                    include: {
                      translations: {
                        where: {
                          language: { in: getTranslationLanguages(locale) },
                        },
                        select: { language: true, name: true },
                      },
                    },
                  },
                },
              },
            },
          }),

          prisma.project.count({ where }),
        ]);

        const projects: PublicProject[] = projectsRes.map((project) => {
          const translated = getTranslatedContent(project.translations, locale);

          return {
            id: project.id,
            createdAt: project.createdAt,
            updatedAt: project.updatedAt,
            slug: project.slug,
            githubLink: project.githubLink,
            liveLink: project.liveLink,
            startDate: project.startDate,
            endDate: project.endDate,
            isPublished: project.isPublished,

            title: translated?.title || '',
            // Rendered here, server-side: this list is fetched by a client
            // widget (TanStack Query), which must not import the tiptap
            // render schema itself.
            description: richTextToPlainText(translated?.description),
            descriptionHtml: renderRichTextHtml(translated?.description),

            techStacks: project.techStacks.map(({ techStack }) => ({
              id: techStack.id,
              createdAt: techStack.createdAt,
              updatedAt: techStack.updatedAt,
              name: techStack.name,
              slug: techStack.slug,
              group: techStack.group,
              sortOrder: techStack.sortOrder,
              logo: techStack.logo || null,
              userId: techStack.userId,
            })),

            tags: project.tags.map(({ tag }) => {
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
        });

        return {
          data: projects,
          meta: buildPaginatedMeta({ page, limit, totalCount: total }),
        };
      },
      {
        // Published-only, session-independent list: safe to share. The key
        // mirrors every closure argument the query depends on (locale is
        // appended by the handler).
        cache: true,
        cacheKey: [
          'paginated-public-projects',
          String(page),
          String(limit),
          search ?? '',
          tagSlugs.join(','),
          techStackSlugs.join(','),
        ],
        cacheTags: [CACHE_TAGS.PROJECT],
      }
    );
  });
}
