'use server';

import { prisma } from '@byte-of-me/db';
import { revalidateTag } from 'next/cache';

import type { ProjectFromValues } from '@/entities/project/model';
import { requireAdmin } from '@/shared/lib/auth';
import { CACHE_TAGS } from '@/shared/lib/constants';





export async function updateProject(id: string, data: ProjectFromValues) {
  await requireAdmin();

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

  revalidateTag(CACHE_TAGS.PROJECT, 'max');

  return project;
}
