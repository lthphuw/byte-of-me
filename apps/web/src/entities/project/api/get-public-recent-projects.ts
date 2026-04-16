'use server';

import { prisma } from '@byte-of-me/db';

import type { PublicProject } from '@/entities/project/model/types';
import {
  handlePublicAction,
  withPublicActionHandler,
} from '@/shared/api/public-action-template';
import { CACHE_TAGS } from '@/shared/lib/constants';
import { getTranslatedContent } from '@/shared/lib/i18n-utils';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

export async function getPublicRecentProjects(): Promise<
  ApiResponse<{ recentProjects: PublicProject[] }>
> {
  return handlePublicAction('getPublicRecentProjects', async () => {
    return await withPublicActionHandler(
      'getPublicRecentProjects',
      async ({ userId, locale }) => {
        const projects = await prisma.project.findMany({
          where: { isPublished: true, userId },
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
          orderBy: { updatedAt: 'desc' },
          take: 2,
        });

        const recentProjects: PublicProject[] = projects.map((p) => {
          const t = getTranslatedContent(p.translations, locale);
          return {
            ...t,
            id: p.id,
            slug: p.slug,
            startDate: p.startDate,
            endDate: p.endDate,
            githubLink: p.githubLink,
            liveLink: p.liveLink,
            isPublished: p.isPublished,
            techStacks: p.techStacks.map(({ techStack }) => ({
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

            tags: p.tags.map(({ tag }) => {
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

        return { recentProjects };
      },
      {
        cache: true,
        cacheKey: ['user-profile-recent-projects'],
        cacheTags: [CACHE_TAGS.PROJECT],
      }
    );
  });
}
