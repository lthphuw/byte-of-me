'use server';

import type { ApiResponse } from '@byte-of-me/api-core';
import { CACHE_TAGS } from '@byte-of-me/api-core';
import { idSchema, parseInput } from '@byte-of-me/api-core/server';
import {
  type ProjectFromValues,
  projectSchema,
} from '@byte-of-me/contracts/project';
import { prisma, type Project } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import { revalidateTag } from 'next/cache';

import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';

export async function updateProject(
  id: string,
  input: ProjectFromValues
): Promise<ApiResponse<Project>> {
  const user = await requireAdmin();

  try {
    const parsedId = parseInput(idSchema, id);
    if (!parsedId.ok) {
      return { success: false, errorMsg: parsedId.errorMsg };
    }
    const parsed = parseInput(projectSchema, input);
    if (!parsed.ok) {
      return { success: false, errorMsg: parsed.errorMsg };
    }
    const data = parsed.data;

    const project = await prisma.$transaction(async (tx) => {
      const previousJoins = await tx.projectOnProjectCoAuthor.findMany({
        where: { projectId: id },
        select: { coauthorId: true },
      });
      const previousCoauthorIds = previousJoins.map((join) => join.coauthorId);

      const updated = await tx.project.update({
        where: { id, userId: user.id },
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
            create: data.translations.map((t) => ({
              language: t.language,
              title: t.title,
              description: t.description,
            })),
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

    // Public blogs embed the related project's title and slug.
    revalidateTag(CACHE_TAGS.PROJECT, 'max');
    revalidateTag(CACHE_TAGS.BLOG, 'max');

    return { success: true, data: project };
  } catch (error) {
    const errorMsg = getErrorMessage(error);
    logger.error(`[Project] update: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
