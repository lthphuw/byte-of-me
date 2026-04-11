'use server';

import {
  handlePublicAction,
  withPublicActionHandler,
} from '@/shared/api/public-action-template';
import { getTranslatedContent } from '@/shared/lib/i18n-utils';
import { ApiResponse } from '@/shared/types/api/api-response.type';
import { prisma } from '@byte-of-me/db';

export async function getPublicAboutMe(): Promise<
  ApiResponse<{
    aboutMe: string;
  }>
> {
  return handlePublicAction('getAboutMe', async () => {
    return await withPublicActionHandler(
      'getAboutMe',
      async ({ userId, locale }) => {
        const userProfile = await prisma.userProfile.findUniqueOrThrow({
          where: { userId },
          include: {
            translations: {
              select: {
                language: true,
                aboutMe: true,
              },
            },
          },
        });

        const profileTranslation = getTranslatedContent(
          userProfile?.translations || [],
          locale
        );

        return { aboutMe: profileTranslation.aboutMe || '' };
      },
      {
        cache: true,
        cacheKey: ['about-me-cache'],
        cacheTags: ['profile'],
      }
    );
  });
}
