'use server';

import type { ProjectFromValues } from '@/entities/project/model';
import { requireUser } from '@/features/auth/lib/session';

import { prisma } from '@byte-of-me/db';

export async function updateProject(id: string, data: ProjectFromValues) {
  await requireUser();

  const project = await prisma.project.update({
    where: { id },
    data: {
      slug: data.slug,
      githubLink: data.githubLink || null,
      liveLink: data.liveLink || null,
      startDate: data.startDate ? new Date(data.startDate) : null,
      endDate: data.endDate ? new Date(data.endDate) : null,

      techStacks: {
        deleteMany: {},
        create: data.techStackIds?.map((techId) => ({
          techStack: { connect: { id: techId } },
        })),
      },

      tags: {
        deleteMany: {},
        create:
          data.tagIds?.map((tagId) => ({
            tag: { connect: { id: tagId } },
          })) || [],
      },

      translations: {
        deleteMany: {},
        create: data.translations,
      },
    },
  });

  return project;
}
