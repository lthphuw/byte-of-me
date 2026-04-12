'use server';

import { prisma } from '@byte-of-me/db';

import type { PublicSocialLink } from '@/entities/social-link/model/types';
import {
  handlePublicAction,
  withPublicActionHandler,
} from '@/shared/api/public-action-template';
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
        cacheKey: ['user-contacts'],
        cacheTags: ['contacts'],
      }
    );
  });
}
