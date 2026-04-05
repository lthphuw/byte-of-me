'use server';

import { Project } from '@/models/project';
import { UserProfile } from '@/models/user-profile';

import { ApiActionResponse } from '@/types/api/api-action.type';
import { getTranslatedContent } from '@/lib/i18n';

import {
  handlePublicAction,
  withPublicActionHandler,
} from './public-action-template';

export async function getUserProfileWithRecentProjects(): Promise<
  ApiActionResponse<{ userProfile: UserProfile; recentProjects: Project[] }>
> {
  return handlePublicAction('getUserProfileWithRecentProjects', async () => {
    const data = await withPublicActionHandler(
      'getUserProfileWithRecentProjects',
      async ({ email, locale, prisma }) => {
        const user = await prisma.user.findUniqueOrThrow({
          where: { email },
          include: {
            userProfile: {
              include: { translations: true },
            },
            projects: {
              include: { translations: true },
              orderBy: { createdAt: 'desc' },
              take: 3,
            },
          },
        });

        const profileTranslation = getTranslatedContent(
          user.userProfile?.translations || [],
          locale
        );

        if (!user.userProfile || !profileTranslation) {
          throw new Error(`Profile data missing for user: ${email}`);
        }

        const recentProjects: Project[] = user.projects.map((p) => {
          const t = getTranslatedContent(p.translations, locale);
          return {
            ...t,
            id: p.id,
            slug: p.slug,
            startDate: p.startDate,
            endDate: p.endDate,
            githubLink: p.githubLink,
            liveLink: p.liveLink,
            isPublished: p.isPublished,
            tags: [],
            techStacks: [],
          };
        });

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

        return { userProfile, recentProjects };
      },
      {
        cache: true,
        cacheKey: ['user-profile-recent-projects'],
        cacheTags: ['profile', 'projects'],
      }
    );
    return data;
  });
}
