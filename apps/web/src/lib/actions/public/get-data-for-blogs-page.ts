'use server';

import { Tag } from '@/models/tag';

import { ApiActionResponse } from '@/types/api/api-action.type';
import { getTranslatedContent } from '@/lib/i18n';

import {
  handlePublicAction,
  withPublicActionHandler,
} from './public-action-template';

export async function getDataForBlogsPage(): Promise<
  ApiActionResponse<{ userId: string; tags: Tag[] }>
> {
  return handlePublicAction('getDataForBlogsPage', async () => {
    const data = await withPublicActionHandler(
      'getDataForBlogsPage',
      async ({ email, locale, prisma }) => {
        const [user, tagsRes] = await Promise.all([
          prisma.user.findUniqueOrThrow({
            where: { email },
            include: { userProfile: true },
          }),

          prisma.tag.findMany({
            include: { translations: true },
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

        return {
          userId: user.id,
          tags,
        };
      },
      {
        cache: true,
        cacheKey: ['blogs-page-data'],
        cacheTags: ['tags', 'profile'],
      }
    );
    return data;
  });
}
