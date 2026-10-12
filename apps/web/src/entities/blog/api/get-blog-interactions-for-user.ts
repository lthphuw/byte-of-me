'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import { z } from 'zod';

import { getAuthenticatedUser } from '@/shared/lib/auth';
import { INTERACTION } from '@/shared/lib/constants';
import { getErrorMessage } from '@/shared/lib/utils';
import { idSchema, parseInput } from '@/shared/lib/validate-action-input';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

export type BlogInteractionState = { isInteracted: boolean; count: number };

const getBlogInteractionsSchema = z.object({
  blogId: idSchema,
  interaction: z.nativeEnum(INTERACTION),
});

/** Public count for everyone; `isInteracted` is set only for a signed-in reader. */
export async function getBlogInteractionsForUser(
  blogId: string,
  interaction: INTERACTION
): Promise<ApiResponse<BlogInteractionState>> {
  const parsed = parseInput(
    getBlogInteractionsSchema,
    { blogId, interaction },
    'getBlogInteractionsForUser'
  );
  if (!parsed.ok) {
    return { success: false, errorMsg: parsed.errorMsg };
  }

  try {
    const user = await getAuthenticatedUser();

    let isInteracted = false;
    if (user?.id) {
      const res = await prisma.interaction.findUnique({
        where: {
          userId_blogId_type: {
            userId: user.id,
            blogId: parsed.data.blogId,
            type: parsed.data.interaction,
          },
        },
      });
      isInteracted = !!res;
    }

    const count = await prisma.interaction.count({
      where: {
        blogId: parsed.data.blogId,
        type: parsed.data.interaction,
      },
    });

    return { success: true, data: { isInteracted, count } };
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to load interactions');
    logger.error(`[Blog] getBlogInteractionsForUser: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
