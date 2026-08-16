'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import { getLocale } from 'next-intl/server';

import type { PublicUserProfile } from '@/entities/user-profile/model/types';
import { env } from '@/shared/config/env';
import { requireAdmin } from '@/shared/lib/auth';
import {
  getTranslatedContent,
  getTranslationLanguages,
} from '@/shared/lib/i18n-utils';
import { getErrorMessage } from '@/shared/lib/utils';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

export async function getUserProfile(): Promise<
  ApiResponse<PublicUserProfile>
> {
  try {
    const auth = await requireAdmin();
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
            // Display-only read: one locale (+ 'en' fallback) is enough. The
            // editor uses getAdminUserProfile, which keeps every locale.
            translations: {
              where: { language: { in: getTranslationLanguages(locale) } },
            },
          },
        },
      },
    });
    // The row is NOT stringified into the log. It carries the owner's address,
    // birthdate and every translated bio field, and this ran on each `/space/*`
    // request before the callers narrowed to `getOwnerDisplayName` — a full
    // personal profile written to the log line by line, for a message whose
    // only job is to say the lookup resolved.
    logger.debug(
      `Get user profile ${auth.email} with locale ${locale}: resolved`
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
  } catch (error) {
    const errorMsg = getErrorMessage(error);
    logger.error(`[Service Error] getUserProfile: ${errorMsg}`);

    return {
      success: false,
      errorMsg,
    };
  }
}
