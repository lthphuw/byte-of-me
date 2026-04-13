'use server';

import type { ProjectFromValues } from '@/entities/project/model';
import { requireUser } from '@/features/auth/lib/session';

import { prisma } from '@byte-of-me/db';

export async function createProject(data: ProjectFromValues) {
  const session = await requireUser();

  const project = await prisma.project.create({
    data: {
      userId: session.id,
      slug: data.slug,
      githubLink: data.githubLink || null,
      liveLink: data.liveLink || null,
      startDate: data.startDate ? new Date(data.startDate) : null,
      endDate: data.endDate ? new Date(data.endDate) : null,

      techStacks: {
        create:
          data.techStackIds?.map((techStackId) => ({
            techStack: {
              connect: { id: techStackId },
            },
          })) ?? [],
      },

      tags: {
        create:
          data.tagIds?.map((tagId) => ({
            tag: {
              connect: { id: tagId },
            },
          })) ?? [],
      },

      translations: {
        create: data.translations.map((t) => ({
          language: t.language,
          title: t.title,
          description: t.description,
        })),
      },
    },
  });

  return project;
}
