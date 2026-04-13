'use server';

import { prisma } from '@byte-of-me/db';

import type { PublicProject } from '@/entities/project/model/types';
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

export type GetPublicProjectsParams = PaginatedParams & {
  tagSlugs?: string[];
  techStackSlugs?: string[];
  search?: string;
};

export async function getPaginatedPublicProjects(
  params: GetPublicProjectsParams
): Promise<ApiResponse<PaginatedData<PublicProject>>> {
  return handlePublicAction('getPaginatedPublicProjects', async () => {
    return await withPublicActionHandler(
      'getPaginatedPublicProjects',
      async ({ userId, locale }) => {
        // await delay(5000);

        const {
          page = 1,
          limit = 9,
          tagSlugs = [],
          techStackSlugs = [],
          search,
        } = params;

        const skip = (page - 1) * limit;

        const where: any = {
          userId,
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

        if (techStackSlugs.length > 0) {
          techStackSlugs.forEach((slug) => {
            where.AND.push({
              techStacks: { some: { techStack: { slug } } },
            });
          });
        }

        // SEARCH
        if (search) {
          where.translations = {
            some: {
              OR: [
                {
                  title: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
                {
                  description: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
              ],
            },
          };
        }

        if (where.AND.length === 0) delete where.AND;

        const [projectsRes, total] = await Promise.all([
          prisma.project.findMany({
            where,
            orderBy: { startDate: 'desc' },
            skip,
            take: limit,

            include: {
              translations: true,

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
                      translations: true,
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
            description: translated?.description || '',

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
          meta: {
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            totalCount: total,
            hasMore: page < Math.ceil(total / limit),
          },
        };
      },
      {
        cache: false,
      }
    );
  });
}
