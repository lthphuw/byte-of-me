'use server';

import { UserProfile } from '@/models/user-profile';
import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import { getLocale } from 'next-intl/server';

import { env } from '@/env.mjs';
import { ApiActionResponse } from '@/types/api/api-action.type';
import { getTranslatedContent } from '@/lib/i18n';
import { requireUser } from '@/lib/auth/session';

export async function getUserProfile(): Promise<
  ApiActionResponse<UserProfile>
> {
  try {
    const auth = await requireUser();
    let email = auth.email;

    if (!email) {
      email = env.EMAIL;
    }

    const locale = await getLocale();
    logger.debug(`Get user profile ${auth.email} with locale ${locale}`);

    const user = await prisma.user.findUniqueOrThrow({
      where: { email },
      include: {
        userProfile: {
          include: {
            translations: true,
          },
        },
      },
    });
    logger.debug(
      `Get user profile ${auth.email} with locale ${locale}: ${JSON.stringify(
        user
      )}`
    );

    if (!user.userProfile) {
      throw new Error(`Profile data missing for user: ${auth.email}`);
    }

    const { translations } = user.userProfile;
    const translation = getTranslatedContent(translations, locale);

    const data: UserProfile = {
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
      success: true,
      data,
    };
  } catch (error: any) {
    logger.error(`[Service Error] getUserProfile: ${error.message}`);

    return {
      success: false,
      errorMsg: error.message || 'An unexpected error occurred',
    };
  }
}
