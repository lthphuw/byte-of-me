'use server';

import { Education, EducationAchievement } from '@/models/education';
import { TechStack } from '@/models/tech-stack';
import { UserProfile } from '@/models/user-profile';

import { ApiActionResponse } from '@/types/api/api-action.type';
import { getTranslatedContent } from '@/lib/i18n';

import {
  handlePublicAction,
  withPublicActionHandler,
} from './public-action-template';

export async function getAboutInfo(): Promise<
  ApiActionResponse<{
    userProfile: UserProfile;
    techStacks: TechStack[];
    educations: Education[];
  }>
> {
  return handlePublicAction('getAboutInfo', async () => {
    const data = await withPublicActionHandler(
      'getAboutInfo',
      async ({ email: userEmail, locale, prisma }) => {
        const user = await prisma.user.findUniqueOrThrow({
          where: { email: userEmail },
          include: {
            userProfile: {
              include: { translations: true },
            },
            techStacks: {
              include: { logo: true },
              orderBy: { sortOrder: 'asc' },
            },
            educations: {
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
            },
          },
        });

        const profileTranslation = getTranslatedContent(
          user.userProfile?.translations || [],
          locale
        );

        if (!user.userProfile || !profileTranslation) {
          throw new Error(`Profile data missing for user: ${userEmail}`);
        }

        const userProfile: UserProfile = {
          id: user.id,
          email: user.email,
          role: user.role,
          birthdate: user.userProfile.birthdate,
          displayName: profileTranslation.displayName ?? '',
          firstName: profileTranslation.firstName ?? '',
          lastName: profileTranslation.lastName ?? '',
          middleName: profileTranslation.middleName ?? '',
          greeting: profileTranslation.greeting ?? '',
          tagLine: profileTranslation.tagLine ?? '',
          quote: profileTranslation.quote ?? '',
          quoteAuthor: profileTranslation.quoteAuthor ?? '',
          bio: profileTranslation.bio ?? '',
          aboutMe: profileTranslation.aboutMe ?? '',
        };

        const techStacks: TechStack[] = user.techStacks.map((t) => ({
          id: t.id,
          name: t.name,
          slug: t.slug,
          group: t.group,
          sortOrder: t.sortOrder,
          logo: t.logo,
          userId: t.userId,
        }));

        const educations: Education[] = user.educations.map((edu) => {
          const t = getTranslatedContent(edu.translations, locale);

          const achievements: EducationAchievement[] = edu.achievements.map(
            (a) => {
              const at = getTranslatedContent(a.translations, locale);
              return {
                id: a.id,
                sortOrder: a.sortOrder,
                title: at?.title ?? '',
                content: at?.content ?? '',
                images: a.images.map((i: any) => i.media),
              };
            }
          );

          return {
            id: edu.id,
            title: t?.title ?? '',
            description: t?.description ?? '',
            startDate: edu.startDate,
            endDate: edu.endDate,
            logo: edu.logo,
            achievements,
          };
        });

        return { userProfile, techStacks, educations };
      },
      {
        cache: true,
        cacheKey: ['about-info-cache'],
        cacheTags: ['profile', 'tech-stacks', 'educations'],
      }
    );
    return data;
  });
}
