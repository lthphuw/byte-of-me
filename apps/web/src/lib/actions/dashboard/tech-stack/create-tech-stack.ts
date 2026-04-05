'use server';

import { prisma } from '@byte-of-me/db';

import { requireUser } from '@/lib/auth/session';
import { TechStackFormValues } from '@/lib/schemas/tech-stack.schema';

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
