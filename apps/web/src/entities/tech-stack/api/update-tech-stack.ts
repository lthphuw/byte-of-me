'use server';

import type { TechStackFormValues } from '@/entities/tech-stack/model/tech-stack-schema';
import { requireUser } from '@/features/auth/lib/session';

import { prisma } from '@byte-of-me/db';

export async function updateTechStack(id: string, data: TechStackFormValues) {
  try {
    const user = await requireUser();

    return await prisma.techStack
      .updateMany({
        where: { id, userId: user.id },
        data: {
          ...data,
          logoId: data.logoId ?? null,
        },
      })
      .then(async (res) => {
        if (!res.count) throw new Error('Not found');
        return prisma.techStack.findUnique({
          where: { id },
          include: { logo: true },
        });
      });
  } catch (error: any) {
    console.error('updateTechStack:', error.message);
    return null;
  }
}
