'use server';

import { PublicProject } from '@/entities/project/model/types';
import {
  handlePublicAction,
  withPublicActionHandler,
} from '@/shared/api/public-action-template';
import { getTranslatedContent } from '@/shared/lib/i18n-utils';
import { ApiResponse } from '@/shared/types/api/api-response.type';
import { prisma } from '@byte-of-me/db';

export async function getPublicRecentProjects(): Promise<
  ApiResponse<{ recentProjects: PublicProject[] }>
> {
  return handlePublicAction('getPublicRecentProjects', async () => {
    return await withPublicActionHandler(
      'getPublicRecentProjects',
      async ({ userId, locale }) => {
        const projects = await prisma.project.findMany({
          where: { isPublished: true, userId },
          include: { translations: true },
          orderBy: { updatedAt: 'desc' },
          take: 2,
        });

        const recentProjects: PublicProject[] = projects.map((p) => {
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
        return { recentProjects };
      },
      {
        cache: true,
        cacheKey: ['user-profile-recent-projects'],
        cacheTags: ['profile', 'projects'],
      }
    );
  });
}
