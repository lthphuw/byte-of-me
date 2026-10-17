'use server';

import type { ApiResponse } from '@byte-of-me/api-core';
import { CACHE_TAGS } from '@byte-of-me/api-core';
import { prisma } from '@byte-of-me/db';

import type { PublicSocialLink } from '@/entities/social-link/model/types';
import { handlePublicAction, withPublicActionHandler } from '@/shared/api';

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
