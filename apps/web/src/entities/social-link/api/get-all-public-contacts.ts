'use server';

import { prisma } from '@byte-of-me/db';

import type { PublicSocialLink } from '@/entities/social-link/model/types';
import { handlePublicAction, withPublicActionHandler } from '@/shared/api';
import { CACHE_TAGS } from '@/shared/lib/constants';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

export async function getAllPublicContacts(): Promise<
  ApiResponse<{ socialLinks: PublicSocialLink[] }>
> {
  return handlePublicAction('getAllPublicContacts', async () => {
    return await withPublicActionHandler(
      'getAllPublicContacts',
      async ({ userId }) => {
        const socialLinks = await prisma.socialLink.findMany({
          where: { userId },
          orderBy: {
            sortOrder: 'desc',
          },
        });
        return { socialLinks: socialLinks };
      },
      {
        cache: true,
        cacheKey: [CACHE_TAGS.SOCIAL],
        cacheTags: [CACHE_TAGS.SOCIAL],
      }
    );
  });
}
