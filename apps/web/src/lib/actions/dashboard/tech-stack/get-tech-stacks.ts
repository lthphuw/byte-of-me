'use server';

import { connection } from 'next/server';
import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import { Prisma } from '../../../../../../../packages/db/generated/prisma/client';

import { ApiActionResponse } from '@/types/api/api-action.type';
import { requireUser } from '@/lib/auth/session';





export type TechStack = Prisma.TechStackGetPayload<{
  include: {
    logo: true;
  };
}>;

export async function getAllTechStack(): Promise<
  ApiActionResponse<TechStack[]>
> {

  try {
    const user = await requireUser();

    const techStacks = await prisma.techStack.findMany({
      where: { userId: user.id },
      include: { logo: true },
      orderBy: [{ group: 'asc' }, { sortOrder: 'asc' }],
    });

    return {
      success: true,
      data: techStacks,
    };
  } catch (error: any) {
    logger.error(`[Service Error] getAllTechStack: ${error.message}`);

    return {
      success: false,
      errorMsg: error.message || 'An unexpected error occurred',
    };
  }
}
