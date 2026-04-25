'use server';

import { prisma } from '@byte-of-me/db';

import type { PublicUserProfile } from '@/entities/user-profile/model/types';
import { handlePublicAction, withPublicActionHandler } from '@/shared/api';
import { CACHE_TAGS } from '@/shared/lib/constants';
import { getTranslatedContent } from '@/shared/lib/i18n-utils';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

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
          userProfile?.translations || [],
          locale
        );

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
        cacheTags: [CACHE_TAGS.USER, CACHE_TAGS.PROJECT],
      }
    );
  });
}
