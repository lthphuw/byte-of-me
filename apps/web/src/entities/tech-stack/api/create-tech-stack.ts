'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import { revalidateTag } from 'next/cache';

import type { TechStackFormValues } from '@/entities/tech-stack/model/tech-stack-schema';
import { requireAdmin } from '@/shared/lib/auth';
import { CACHE_TAGS } from '@/shared/lib/constants';

export async function addTechStack(data: TechStackFormValues) {
  try {
    const user = await requireAdmin();

    const newTech = await prisma.techStack.create({
      data: {
        ...data,
        logoId: data.logoId ?? null,
        userId: user.id,
      },
      include: {
        logo: true,
      },
    });

    revalidateTag(CACHE_TAGS.TECH, 'max');

    return { success: true, data: newTech };
  } catch (error: Any) {
    logger.error('addTechStack:', error.message);
    return { success: false, error: 'Failed to add tech stack item' };
  }
}
