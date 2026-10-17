'use server';

import type { ApiResponse } from '@byte-of-me/api-core';
import { INTERACTION } from '@byte-of-me/api-core';
import { idSchema, parseInput } from '@byte-of-me/api-core/server';
import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import { z } from 'zod';

import { PUBLIC_ACTION_FAILURE_MESSAGE } from '@/shared/api';
import { getAuthenticatedUser } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';

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
    logger.error(
      `[Blog] getBlogInteractionsForUser: ${getErrorMessage(error)}`
    );
    return { success: false, errorMsg: PUBLIC_ACTION_FAILURE_MESSAGE };
  }
}
