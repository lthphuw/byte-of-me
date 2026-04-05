'use server';

import { Tag } from '@/models/tag';
import { TechStack } from '@/models/tech-stack';

import { ApiActionResponse } from '@/types/api/api-action.type';
import { getTranslatedContent } from '@/lib/i18n';

import {
  handlePublicAction,
  withPublicActionHandler,
} from './public-action-template';

export async function getDataForProjectsPage(): Promise<
  ApiActionResponse<{ userId: string; tags: Tag[]; techStacks: TechStack[] }>
> {
  return handlePublicAction('getDataForProjectsPage', async () => {
    const data = await withPublicActionHandler(
      'getDataForProjectsPage',
      async ({ email, locale, prisma }) => {
        const [user, tagsRes, techStacksRes] = await Promise.all([
          prisma.user.findUniqueOrThrow({
            where: { email },
            include: { userProfile: true },
          }),

          prisma.tag.findMany({
            include: { translations: true },
          }),

          prisma.techStack.findMany({
            include: { logo: true },
            orderBy: { sortOrder: 'asc' },
          }),
        ]);

        const tags: Tag[] = tagsRes.map((tag) => {
          const translated = getTranslatedContent(tag.translations, locale);
          return {
            id: tag.id,
            slug: tag.slug,
            name: translated?.name || '',
          };
        });

        const techStacks: TechStack[] = techStacksRes.map((ts) => ({
          id: ts.id,
          name: ts.name,
          slug: ts.slug,
          group: ts.group,
          sortOrder: ts.sortOrder,
          logo: ts.logo || null,
          userId: ts.userId,
        }));

        return {
          userId: user.id,
          tags,
          techStacks,
        };
      },
      {
        cache: true,
        cacheKey: ['projects-page-data'],
        cacheTags: ['tags', 'tech-stacks', 'profile'],
      }
    );
    return data;
  });
}
