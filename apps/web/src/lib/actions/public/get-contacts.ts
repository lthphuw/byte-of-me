'use server';

import { SocialLink } from '@/models/social-link';

import { ApiActionResponse } from '@/types/api/api-action.type';

import {
  handlePublicAction,
  withPublicActionHandler,
} from './public-action-template';

export async function getContacts(): Promise<
  ApiActionResponse<{ socialLinks: SocialLink[] }>
> {
  return handlePublicAction('getContacts', async () => {
    const data = await withPublicActionHandler(
      'getContacts',
      async ({ email: userEmail, prisma }) => {
        const user = await prisma.user.findUniqueOrThrow({
          where: { email: userEmail },
          include: {
            socialLinks: true,
          },
        });
        return { socialLinks: user.socialLinks };
      },
      {
        cache: true,
        cacheKey: ['user-contacts'],
        cacheTags: ['contacts'],
      }
    );
    return data;
  });
}
