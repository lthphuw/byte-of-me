'use server';

import type { TechStackFormValues } from '@/entities/tech-stack/model/tech-stack-schema';
import { requireUser } from '@/features/auth/lib/session';

import { prisma } from '@byte-of-me/db';

export async function addTechStack(data: TechStackFormValues) {
  try {
    const user = await requireUser();

    return await prisma.techStack.create({
      data: {
        ...data,
        logoId: data.logoId ?? null,
        userId: user.id,
      },
      include: { logo: true },
    });
  } catch (error: any) {
    console.error('addTechStack:', error.message);
    return null;
  }
}
