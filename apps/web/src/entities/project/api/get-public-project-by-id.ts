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

export async function getPublicProjectById(
  id: string
): Promise<ApiResponse<Nullable<PublicProject>>> {
  return handlePublicAction('getPublicProjectById', async () => {
    return await withPublicActionHandler(
      'getPublicProjectById',
      async ({ userId, locale }) => {
        const project = await prisma.project.findUnique({
          where: { isPublished: true, userId, id },
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

            coauthors: {
              include: {
                coauthor: true,
              },
            },
          },
        });
        if (!project) {
          return null;
        }

        const t = getTranslatedContent(project.translations, locale);
        if (!t) {
          throw new Error(`No translation found for project ${project.id}`);
        }

        return {
          ...t,
          // The related-project card clamps the description, so it gets the
          // text-only reading of the stored rich text.
          description: richTextToPlainText(t.description),
          id: project.id,
          slug: project.slug,
          startDate: project.startDate,
          endDate: project.endDate,
          githubLink: project.githubLink,
          liveLink: project.liveLink,
          isPublished: project.isPublished,
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

          coauthors: project.coauthors.map(({ coauthor }) => ({
            id: coauthor.id,
            fullName: coauthor.fullName,
            email: coauthor.email,
          })),
        };
      },
      {
        cache: true,
        cacheKey: ['related-project', id],
        cacheTags: [CACHE_TAGS.PROJECT, id],
      }
    );
  });
}
