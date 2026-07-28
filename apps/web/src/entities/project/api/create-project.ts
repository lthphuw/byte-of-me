'use server';

import { prisma,type Project } from '@byte-of-me/db';
import { revalidateTag } from 'next/cache';

import { type ProjectFromValues, projectSchema } from '@/entities/project/model';
import { requireAdmin } from '@/shared/lib/auth';
import { CACHE_TAGS } from '@/shared/lib/constants';
import { parseInput } from '@/shared/lib/validate-action-input';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

export async function createProject(
  input: ProjectFromValues
): Promise<ApiResponse<Project>> {
  const session = await requireAdmin();

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
}
