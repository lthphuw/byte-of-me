'use server';

import type { PublicSocialLink } from '@/entities/social-link/model/types';
import {
  handlePublicAction,
  withPublicActionHandler,
} from '@/shared/api/public-action-template';
import { siteConfig } from '@/shared/config/site';
import { getTranslatedContent } from '@/shared/lib/i18n-utils';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

import { prisma } from '@byte-of-me/db';

export async function getPublicInfoForFooter(): Promise<
  ApiResponse<{
    displayName: string;
    email: string;
    socialLinks: PublicSocialLink[];
  }>
> {
  return handlePublicAction('getPublicInfoForFooter', async () => {
    return await withPublicActionHandler(
      'getPublicInfoForFooter',
      async ({ userId, email: userEmail, locale }) => {
        const [userProfile, socialLinks] = await Promise.all([
          prisma.userProfile.findUniqueOrThrow({
            where: { userId },
            include: {
              translations: {
                select: {
                  language: true,
                  displayName: true,
                },
              },
            },
          }),
          prisma.socialLink.findMany({
            where: { userId },
          }),
        ]);

        const { translations } = userProfile;
        const translation = getTranslatedContent(translations, locale);

        return {
          displayName: translation.displayName || siteConfig.name,
          email: userEmail,
          socialLinks,
        };
      },
      {
        cache: true,
        cacheKey: ['user-info-for-footer'],
        cacheTags: ['userInfoForFooter', 'social-link', 'user-profile'],
      }
    );
  });
}
