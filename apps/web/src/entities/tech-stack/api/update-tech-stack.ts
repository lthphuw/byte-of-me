'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import { revalidateTag } from 'next/cache';

import type { TechStackFormValues } from '@/entities/tech-stack/model/tech-stack-schema';
import { CACHE_TAGS } from '@/shared/lib/constants';
import { requireUser } from '@/shared/lib/session';

export async function updateTechStack(id: string, data: TechStackFormValues) {
  try {
    const user = await requireUser();

    const result = await prisma.techStack.updateMany({
      where: {
        id,
        userId: user.id,
      },
      data: {
        ...data,
        logoId: data.logoId ?? null,
      },
    });

    if (result.count === 0) {
      return {
        success: false,
        error: 'Tech stack item not found or unauthorized',
      };
    }

    const updatedRecord = await prisma.techStack.findUnique({
      where: { id },
      include: { logo: true },
    });

    revalidateTag(CACHE_TAGS.TECH, 'default');

    return { success: true, data: updatedRecord };
  } catch (error: any) {
    logger.error('updateTechStack:', error.message);
    return { success: false, error: 'Failed to update tech stack' };
  }
}
