'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import { getLocale } from 'next-intl/server';

import type { PublicUserProfile } from '@/entities/user-profile/model/types';
import { env } from '@/env.mjs';
import { requireUser } from '@/features/auth/lib/session';
import { getTranslatedContent } from '@/shared/lib/i18n-utils';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

export async function getUserProfile(): Promise<
  ApiResponse<PublicUserProfile>
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

    const data: PublicUserProfile = {
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
