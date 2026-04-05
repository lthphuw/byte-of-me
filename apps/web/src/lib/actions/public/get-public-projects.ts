'use server';

import { Project } from '@/models/project';

import { ApiActionResponse } from '@/types/api/api-action.type';
import { PaginatedData } from '@/types/api/paginated.type';
import { getTranslatedContent } from '@/lib/i18n';

import {
  handlePublicAction,
  withPublicActionHandler,
} from './public-action-template';

export type GetPublicProjectsParams = {
  page?: number;
  limit?: number;
  tagSlugs?: string[];
  techStackSlugs?: string[];
  search?: string;
};

export async function getPaginatedPublicProjects(
  params: GetPublicProjectsParams
): Promise<ApiActionResponse<PaginatedData<Project>>> {
  return handlePublicAction('getPaginatedPublicProjects', async () => {
    const data = await withPublicActionHandler(
      'getPaginatedPublicProjects',
      async ({ locale, prisma }) => {
        const {
          page = 1,
          limit = 9,
          tagSlugs = [],
          techStackSlugs = [],
          search,
        } = params;

        const skip = (page - 1) * limit;

        const where: any = {
          isPublished: true,
        };

        // FILTER BY TAGS
        if (tagSlugs.length > 0) {
          where.tags = {
            some: {
              tag: {
                slug: {
                  in: tagSlugs,
                },
              },
            },
          };
        }

        // FILTER BY TECH STACKS (JOIN TABLE)
        if (techStackSlugs.length > 0) {
          where.techStacks = {
            some: {
              techStack: {
                slug: {
                  in: techStackSlugs,
                },
              },
            },
          };
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

        const projects: Project[] = projectsRes.map((project) => {
          const translated = getTranslatedContent(project.translations, locale);

          return {
            id: project.id,
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
    return data;
  });
}
