'use server';

import { type Education, prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import { revalidateTag } from 'next/cache';

import {
  type EducationFormValues,
  educationSchema,
} from '@/entities/education/model/education-schema';
import { requireAdmin } from '@/shared/lib/auth';
import { CACHE_TAGS } from '@/shared/lib/constants';
import { getErrorMessage } from '@/shared/lib/utils';
import { idSchema, parseInput } from '@/shared/lib/validate-action-input';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

type AchievementTranslationInput =
  EducationFormValues['achievements'][number]['translations'][number];

/** Field by field, so a parsed row's `id` never reaches the create input. */
function toAchievementTranslation(t: AchievementTranslationInput) {
  return { language: t.language, title: t.title, content: t.content };
}

export async function updateEducation(
  id: string,
  input: EducationFormValues
): Promise<ApiResponse<Education>> {
  const user = await requireAdmin();

  try {
    const parsedId = parseInput(idSchema, id);
    if (!parsedId.ok) {
      return { success: false, errorMsg: parsedId.errorMsg };
    }
    const parsed = parseInput(educationSchema, input);
    if (!parsed.ok) {
      return { success: false, errorMsg: parsed.errorMsg };
    }
    const values = parsed.data;

    const result = await prisma.$transaction(
      async (tx): Promise<ApiResponse<Education>> => {
        const existing = await tx.education.findFirst({
          where: { id, userId: user.id },
          include: { achievements: true },
        });

        if (!existing) {
          return { success: false, errorMsg: 'Education entry not found' };
        }

        const incoming = values.achievements;

        const incomingIds = incoming
          .filter((a) => a.id)
          .map((a) => a.id as string);

        const toDelete = existing.achievements
          .filter((a) => !incomingIds.includes(a.id))
          .map((a) => a.id);

        if (toDelete.length > 0) {
          await tx.educationAchievement.deleteMany({
            where: { id: { in: toDelete } },
          });
        }

        const education = await tx.education.update({
          where: { id },
          data: {
            sortOrder: values.sortOrder,
            startDate: new Date(values.startDate),
            endDate: values.endDate ? new Date(values.endDate) : null,

            logo: values.logoId
              ? { connect: { id: values.logoId } }
              : { disconnect: true },

            translations: {
              deleteMany: {},
              create: values.translations.map((t) => ({
                language: t.language,
                title: t.title,
                description: t.description,
              })),
            },
          },
        });

        // Each achievement touches its own rows, so the writes are issued
        // together like `updateCompany` does, not one `await` per achievement.
        await Promise.all(
          incoming.map((a) => {
            if (!a.id) {
              return tx.educationAchievement.create({
                data: {
                  educationId: id,
                  sortOrder: a.sortOrder,

                  translations: {
                    create: a.translations.map(toAchievementTranslation),
                  },

                  images: {
                    create: a.imageIds.map((id) => ({
                      media: { connect: { id } },
                    })),
                  },
                },
              });
            }

            return tx.educationAchievement.update({
              where: { id: a.id },
              data: {
                sortOrder: a.sortOrder,

                translations: {
                  deleteMany: {},
                  create: a.translations.map(toAchievementTranslation),
                },

                images: {
                  deleteMany: {},
                  create: a.imageIds.map((id) => ({
                    media: { connect: { id } },
                  })),
                },
              },
            });
          })
        );

        return { success: true, data: education };
      }
    );

    // Revalidate only after the transaction has committed, so readers never
    // repopulate the cache from uncommitted (or rolled-back) state.
    if (result.success) {
      revalidateTag(CACHE_TAGS.EDUCATION, 'max');
    }

    return result;
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to update education');
    logger.error(`Update education error: ${errorMsg}`);
    return {
      success: false,
      errorMsg,
    };
  }
}
