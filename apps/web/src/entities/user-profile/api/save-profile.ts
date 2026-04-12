'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import type { ProfileFormValues } from '@/entities/user-profile/schemas/user-profile';
import { requireUser } from '@/features/auth/lib/session';

export async function saveProfile(values: ProfileFormValues) {
  const start = Date.now();

  try {
    const user = await requireUser();

    logger.info('[PROFILE] Start saveProfile', {
      userId: user.id,
    });

    logger.debug('[PROFILE] Payload received', {
      userId: user.id,
      birthdate: values.birthdate,
      translationsCount: values.translations?.length ?? 0,
      socialLinksCount: values.socialLinks?.length ?? 0,
    });

    await prisma.$transaction(async (tx) => {
      logger.debug('[PROFILE] Upserting userProfileSchema', {
        userId: user.id,
        birthdate: values.birthdate,
      });

      const profile = await tx.userProfile.upsert({
        where: { userId: user.id },
        update: {
          birthdate: values.birthdate,
        },
        create: {
          userId: user.id,
          birthdate: values.birthdate,
        },
      });

      logger.debug('[PROFILE] userProfileSchema ready', {
        profileId: profile.id,
      });

      const existing = await tx.userProfileTranslation.findMany({
        where: { userProfileId: profile.id },
        select: { language: true },
      });

      const existingLangs = existing.map((e) => e.language);
      const incomingLangs = values.translations.map((t) => t.language);

      logger.debug('[PROFILE] Translation diff', {
        existingLangs,
        incomingLangs,
        toDelete: existingLangs.filter((lang) => !incomingLangs.includes(lang)),
      });

      const incomingSocialLinks = values.socialLinks;

      logger.debug('[PROFILE] Social links incoming', {
        count: incomingSocialLinks.length,
        platforms: incomingSocialLinks.map((s) => s.platform),
      });

      // DELETE PHASE
      const deleteTranslations = tx.userProfileTranslation.deleteMany({
        where: {
          userProfileId: profile.id,
          language: {
            notIn: incomingLangs,
          },
        },
      });

      const deleteSocialLinks = tx.socialLink.deleteMany({
        where: {
          userId: user.id,
          NOT: incomingSocialLinks.map((s) => ({
            platform: s.platform,
            url: s.url,
          })),
        },
      });

      const [deletedTranslations, deletedSocial] = await Promise.all([
        deleteTranslations,
        deleteSocialLinks,
      ]);

      logger.debug('[PROFILE] Delete results', {
        deletedTranslations: deletedTranslations.count,
        deletedSocialLinks: deletedSocial.count,
      });

      // UPSERT SOCIAL LINKS
      await Promise.all(
        incomingSocialLinks.map((s, index) => {
          logger.debug('[PROFILE] Upserting social link', {
            platform: s.platform,
            url: s.url,
            sortOrder: s.sortOrder,
            index,
          });

          return tx.socialLink.upsert({
            where: {
              userId_platform: {
                userId: user.id,
                platform: s.platform,
              },
            },
            update: {
              url: s.url,
              sortOrder: s.sortOrder,
            },
            create: {
              userId: user.id,
              platform: s.platform,
              url: s.url,
              sortOrder: s.sortOrder,
            },
          });
        })
      );

      // UPSERT TRANSLATIONS
      await Promise.all(
        values.translations.map((t, index) => {
          logger.debug('[PROFILE] Upserting translation', {
            language: t.language,
            hasAboutMe: !!t.aboutMe,
            index,
          });

          return tx.userProfileTranslation.upsert({
            where: {
              userProfileId_language: {
                userProfileId: profile.id,
                language: t.language,
              },
            },
            update: {
              displayName: t.displayName,
              firstName: t.firstName,
              lastName: t.lastName,
              tagLine: t.tagLine,
              bio: t.bio,
              aboutMe: t.aboutMe ?? null,
              quote: t.quote,
              quoteAuthor: t.quoteAuthor,
            },
            create: {
              userProfileId: profile.id,
              language: t.language,
              displayName: t.displayName,
              firstName: t.firstName,
              lastName: t.lastName,
              tagLine: t.tagLine,
              bio: t.bio,
              aboutMe: t.aboutMe ?? null,
              quote: t.quote,
              quoteAuthor: t.quoteAuthor,
            },
          });
        })
      );

      logger.debug('[PROFILE] Transaction completed', {
        profileId: profile.id,
      });
    });

    logger.info('[PROFILE] Save success', {
      durationMs: Date.now() - start,
      translations: values.translations.length,
      socialLinks: values.socialLinks.length,
    });

    return { success: true };
  } catch (error: any) {
    logger.error('[PROFILE] Save failed', {
      message: error.message,
      stack: error.stack,
    });

    return { success: false, error: error.message };
  }
}
