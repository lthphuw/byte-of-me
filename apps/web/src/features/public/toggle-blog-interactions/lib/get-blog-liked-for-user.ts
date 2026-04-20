'use server';

import { prisma } from '@byte-of-me/db';

import { getAuthenticatedUser } from '@/shared/lib/auth';
import { INTERACTION } from '@/shared/lib/constants';





export async function getBlogLikedForUser(blogId: string) {
  const user = await getAuthenticatedUser();

  let isInteracted = false;
  if (user?.id) {
    const interaction = await prisma.interaction.findUnique({
      where: {
        userId_blogId_type: {
          userId: user.id,
          blogId,
          type: INTERACTION.LIKE,
        },
      },
    });
    isInteracted = !!interaction;
  }

  const count = await prisma.interaction.count({
    where: {
      blogId,
      type: INTERACTION.LIKE,
    },
  });

  return { isInteracted, count };
}
