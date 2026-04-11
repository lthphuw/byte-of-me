'use server';

import {
  PublicEducation,
  PublicEducationAchievement,
} from '@/entities/education/model/types';
import {
  handlePublicAction,
  withPublicActionHandler,
} from '@/shared/api/public-action-template';
import { getTranslatedContent } from '@/shared/lib/i18n-utils';
import { ApiResponse } from '@/shared/types/api/api-response.type';
import { prisma } from '@byte-of-me/db';

export async function getAllPublicEducations(): Promise<
  ApiResponse<{
    educations: PublicEducation[];
  }>
> {
  return handlePublicAction('getAllPublicEducations', async () => {
    return await withPublicActionHandler(
      'getAllPublicEducations',
      async ({ userId, locale }) => {
        const items = await prisma.education.findMany({
          where: { userId },
          include: {
            translations: true,
            logo: true,
            achievements: {
              include: {
                translations: true,
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
                images: a.images.map((i: any) => i.media),
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
        cacheTags: ['educations'],
      }
    );
  });
}
