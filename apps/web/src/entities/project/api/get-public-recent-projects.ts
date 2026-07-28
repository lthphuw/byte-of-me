'use server';

import { prisma } from '@byte-of-me/db';
import { richTextToPlainText } from '@byte-of-me/ui/lib/rich-text-content';

import type { PublicProject } from '@/entities/project/model/types';
import { handlePublicAction, withPublicActionHandler } from '@/shared/api';
import { CACHE_TAGS } from '@/shared/lib/constants';
import {
  getTranslatedContent,
  getTranslationLanguages,
} from '@/shared/lib/i18n-utils';
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
            // createdAt/updatedAt stay selected: the `...t` spread below is
            // what populates those fields on the returned PublicProject.
            translations: {
              where: { language: { in: getTranslationLanguages(locale) } },
              select: {
                language: true,
                title: true,
                description: true,
                createdAt: true,
                updatedAt: true,
              },
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
          orderBy: { updatedAt: 'desc' },
          take: 2,
        });

        const recentProjects: PublicProject[] = projects.map((p) => {
          const t = getTranslatedContent(p.translations, locale);
          if (!t) {
            throw new Error(`No translation found for project ${p.id}`);
          }

          return {
            ...t,
            // The homepage card clamps the description, so it gets the
            // text-only reading of the stored rich text.
            description: richTextToPlainText(t.description),
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
