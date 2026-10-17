'use server';

import type { ApiResponse } from '@byte-of-me/api-core';
import {
  CACHE_TAGS,
  getTranslatedContent,
  getTranslationLanguages,
} from '@byte-of-me/api-core';
import { prisma } from '@byte-of-me/db';

import type {
  PublicEducation,
  PublicEducationAchievement,
} from '@/entities/education/model/types';
import {
  handlePublicAction,
  withPublicActionHandler,
} from '@/shared/api/public-action-template';
import { PUBLIC_MEDIA_SELECT } from '@/shared/lib/public-media';

export async function getAllPublicEducations(): Promise<
  ApiResponse<{
    educations: PublicEducation[];
  }>
> {
  return handlePublicAction('getAllPublicEducations', async () => {
    return await withPublicActionHandler(
      'getAllPublicEducations',
      async ({ userId, locale }) => {
        const languages = { in: getTranslationLanguages(locale) };
        const items = await prisma.education.findMany({
          where: { userId },
          include: {
            // Deterministic order so the locale fallback in
            // getTranslatedContent resolves the same way on every request.
            translations: {
              where: { language: languages },
              select: { language: true, title: true, description: true },
              orderBy: { language: 'asc' },
            },
            logo: { select: PUBLIC_MEDIA_SELECT },
            achievements: {
              include: {
                translations: {
                  where: { language: languages },
                  select: { language: true, title: true, content: true },
                  orderBy: { language: 'asc' },
                },
                images: { include: { media: true } },
              },
              orderBy: { sortOrder: 'asc' },
            },
          },
          orderBy: { startDate: 'desc' },
        });

        const educations: PublicEducation[] = items.map((edu) => {
          const t = getTranslatedContent(edu.translations, locale);

          const achievements: PublicEducationAchievement[] =
            edu.achievements.map((a) => {
              const at = getTranslatedContent(a.translations, locale);
              return {
                id: a.id,
                updatedAt: a.updatedAt,
                createdAt: a.createdAt,
                sortOrder: a.sortOrder,
                title: at?.title ?? '',
                content: at?.content ?? '',
                images: a.images.map((i) => i.media),
              };
            });

          return {
            id: edu.id,
            updatedAt: edu.updatedAt,
            createdAt: edu.createdAt,
            title: t?.title ?? '',
            description: t?.description ?? '',
            startDate: edu.startDate,
            endDate: edu.endDate,
            logo: edu.logo,
            achievements,
          };
        });

        return { educations };
      },
      {
        cache: true,
        cacheKey: ['all-educations-cache'],
        cacheTags: [CACHE_TAGS.EDUCATION],
      }
    );
  });
}
