'use server';

import { prisma } from '@byte-of-me/db';

import { getAuthenticatedUser } from '@/shared/lib/auth';
import type { INTERACTION } from '@/shared/lib/constants';





export async function getBlogInteractionsForUser(
  blogId: string,
  interaction: INTERACTION
) {
  const user = await getAuthenticatedUser();

  let isInteracted = false;
  if (user?.id) {
    const res = await prisma.interaction.findUnique({
      where: {
        userId_blogId_type: {
          userId: user.id,
          blogId,
          type: interaction,
        },
      },
    });
    isInteracted = !!res;
  }

  const count = await prisma.interaction.count({
    where: {
      blogId,
      type: interaction,
    },
  });

  return { isInteracted, count };
}
