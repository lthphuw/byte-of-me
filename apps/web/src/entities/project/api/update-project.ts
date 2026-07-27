'use server';

import { prisma,type Project } from '@byte-of-me/db';
import { revalidateTag } from 'next/cache';

import type { ProjectFromValues } from '@/entities/project/model';
import { requireAdmin } from '@/shared/lib/auth';
import { CACHE_TAGS } from '@/shared/lib/constants';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

export async function updateProject(
  id: string,
  data: ProjectFromValues
): Promise<ApiResponse<Project>> {
  await requireAdmin();

  const project = await prisma.$transaction(async (tx) => {
    const previousJoins = await tx.projectOnProjectCoAuthor.findMany({
      where: { projectId: id },
      select: { coauthorId: true },
    });
    const previousCoauthorIds = previousJoins.map((join) => join.coauthorId);

    const updated = await tx.project.update({
      where: { id },
      data: {
        slug: data.slug,
        githubLink: data.githubLink || null,
        liveLink: data.liveLink || null,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        isPublished: data.isPublished,

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

        coauthors: {
          deleteMany: {},
          create:
            data.coauthors?.map((coauthor) => ({
              coauthor: {
                create: {
                  fullName: coauthor.fullName,
                  email: coauthor.email || null,
                },
              },
            })) ?? [],
        },

        translations: {
          deleteMany: {},
          create: data.translations,
        },
      },
    });

    if (previousCoauthorIds.length > 0) {
      await tx.coauthor.deleteMany({
        where: {
          id: { in: previousCoauthorIds },
          projects: { none: {} },
        },
      });
    }

    return updated;
  });

  revalidateTag(CACHE_TAGS.PROJECT, 'max');

  return { success: true, data: project };
}
