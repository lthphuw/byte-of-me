'use server';

import type { ApiResponse } from '@byte-of-me/api-core';
import {
  CACHE_TAGS,
  getTranslatedContent,
  getTranslationLanguages,
} from '@byte-of-me/api-core';
import { prisma } from '@byte-of-me/db';

import type { PublicUserProfile } from '@/entities/user-profile/model/types';
import { handlePublicAction, withPublicActionHandler } from '@/shared/api';

export async function getPublicUserProfile(): Promise<
  ApiResponse<PublicUserProfile>
> {
  return handlePublicAction('getHomepagePublicUserProfile', async () => {
    return await withPublicActionHandler(
      'getHomepagePublicUserProfile',
      async ({ userId, locale }) => {
        const userProfile = await prisma.userProfile.findUniqueOrThrow({
          where: {
            userId,
          },
          include: {
            translations: {
              where: { language: { in: getTranslationLanguages(locale) } },
              select: {
                language: true,
                tagLine: true,
                bio: true,
                displayName: true,
                greeting: true,
                quote: true,
                quoteAuthor: true,
              },
            },
          },
        });

        const profileTranslation = getTranslatedContent(
          userProfile.translations,
          locale
        );
        if (!profileTranslation) {
          throw new Error('No translation found for user profile');
        }

        return {
          displayName: profileTranslation.displayName ?? '',
          greeting: profileTranslation.greeting ?? null,
          tagLine: profileTranslation.tagLine ?? null,
          bio: profileTranslation.bio ?? null,
          quote: profileTranslation.quote ?? null,
          quoteAuthor: profileTranslation.quoteAuthor ?? null,
        };
      },
      {
        cache: true,
        cacheKey: ['homepage-public-user-profile'],
        cacheTags: [CACHE_TAGS.USER],
      }
    );
  });
}
