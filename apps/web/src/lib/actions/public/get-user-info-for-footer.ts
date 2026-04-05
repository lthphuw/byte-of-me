'use server';

import { SocialLink } from '@/models/social-link';
import { UserProfile } from '@/models/user-profile';

import { ApiActionResponse } from '@/types/api/api-action.type';
import { getTranslatedContent } from '@/lib/i18n';

import {
  handlePublicAction,
  withPublicActionHandler,
} from './public-action-template';


export async function getUserInfoForFooter(
  email: string
): Promise<ApiActionResponse<{ profile: UserProfile; socialLinks: SocialLink[]  }>> {
  return handlePublicAction('getUserInfoForFooter', async () => {
    const data = await withPublicActionHandler(
      'getUserInfoForFooter',
      async ({ email: userEmail, locale, prisma }) => {
        const user = await prisma.user.findUniqueOrThrow({
          where: { email: userEmail },
          include: {
            userProfile: {
              include: {
                translations: true,
              },
            },
            socialLinks: true,
          },
        });

        if (!user.userProfile) {
          throw new Error(`Profile data missing for user: ${userEmail}`);
        }

        const socialLinks = user.socialLinks;
        const { translations } = user.userProfile;
        const translation = getTranslatedContent(translations, locale);

        const profile: UserProfile = {
          id: user.id,
          email: user.email,
          role: user.role,
          birthdate: user.userProfile.birthdate,
          displayName: translation?.displayName || '',
          firstName: translation?.firstName || '',
          lastName: translation?.lastName || '',
          middleName: translation?.middleName || '',
          greeting: translation?.greeting || '',
          tagLine: translation?.tagLine || '',
          quote: translation?.quote || '',
          quoteAuthor: translation?.quoteAuthor || '',
          bio: translation?.bio || '',
          aboutMe: translation?.aboutMe || '',
        };

        return {
          profile,
          socialLinks,
        };
      },
      {
        cache: true,
        cacheKey: ['user-info-for-footer'],
        cacheTags: ['userInfoForFooter'],
      }
    );
    return data;
  });
}
