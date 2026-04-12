'use server';

import { prisma } from '@byte-of-me/db';

import type { PublicTechStack } from '@/entities/tech-stack/model/types';
import {
  handlePublicAction,
  withPublicActionHandler,
} from '@/shared/api/public-action-template';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

export async function getAllPublicTechStacks(): Promise<
  ApiResponse<{
    techStacks: PublicTechStack[];
  }>
> {
  return handlePublicAction('getPublicAllTechStacks', async () => {
    return await withPublicActionHandler(
      'getPublicAllTechStacks',
      async ({ userId, locale }) => {
        const items = await prisma.techStack.findMany({
          where: { userId },
          include: { logo: true },
          orderBy: { sortOrder: 'asc' },
        });

        const techStacks: PublicTechStack[] = items.map((t) => ({
          id: t.id,
          createdAt: t.createdAt,
          updatedAt: t.updatedAt,
          name: t.name,
          slug: t.slug,
          group: t.group,
          sortOrder: t.sortOrder,
          logo: t.logo,
          userId: t.userId,
        }));

        return { techStacks };
      },
      {
        cache: true,
        cacheKey: ['all-tech-stack-cache'],
        cacheTags: ['tech-stacks'],
      }
    );
  });
}
