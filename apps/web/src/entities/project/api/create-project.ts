'use server';

import type { ApiResponse } from '@byte-of-me/api-core';
import { CACHE_TAGS } from '@byte-of-me/api-core';
import { parseInput } from '@byte-of-me/api-core/server';
import {
  type ProjectFromValues,
  projectSchema,
} from '@byte-of-me/contracts/project';
import { prisma, type Project } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import { revalidateTag } from 'next/cache';

import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';

export async function createProject(
  input: ProjectFromValues
): Promise<ApiResponse<Project>> {
  const session = await requireAdmin();

  try {
    const parsed = parseInput(projectSchema, input);
    if (!parsed.ok) {
      return { success: false, errorMsg: parsed.errorMsg };
    }
    const data = parsed.data;

    const project = await prisma.project.create({
      data: {
        userId: session.id,
        slug: data.slug,
        githubLink: data.githubLink || null,
        liveLink: data.liveLink || null,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        isPublished: data.isPublished,

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

        coauthors: {
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
          create: data.translations.map((t) => ({
            language: t.language,
            title: t.title,
            description: t.description,
          })),
        },
      },
    });

    revalidateTag(CACHE_TAGS.PROJECT, 'max');
    return { success: true, data: project };
  } catch (error) {
    const errorMsg = getErrorMessage(error);
    logger.error(`[Project] create: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
