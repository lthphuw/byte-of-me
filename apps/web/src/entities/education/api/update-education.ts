'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import { revalidateTag } from 'next/cache';

import type { EducationFormValues } from '@/entities/education/model/education-schema';
import { CACHE_TAGS } from '@/shared/lib/constants';
import { requireUser } from '@/shared/lib/session';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

export async function updateEducation(
  id: string,
  values: EducationFormValues
): Promise<ApiResponse<any>> {
  try {
    const user = await requireUser();

    return await prisma.$transaction(async (tx) => {
      const existing = await tx.education.findFirst({
        where: { id, userId: user.id },
        include: { achievements: true },
      });

      if (!existing) {
        return { success: false, errorMsg: 'PublicEducation not found' };
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
            create: values.translations,
          },
        },
      });

      for (const a of incoming) {
        if (!a.id) {
          // CREATE
          await tx.educationAchievement.create({
            data: {
              educationId: id,
              sortOrder: a.sortOrder,

              translations: {
                create: a.translations,
              },

              images: {
                create: a.imageIds.map((id) => ({
                  media: { connect: { id } },
                })),
              },
            },
          });
        } else {
          await tx.educationAchievement.update({
            where: { id: a.id },
            data: {
              sortOrder: a.sortOrder,

              translations: {
                deleteMany: {},
                create: a.translations,
              },

              images: {
                deleteMany: {},
                create: a.imageIds.map((id) => ({
                  media: { connect: { id } },
                })),
              },
            },
          });
        }
      }
      revalidateTag(CACHE_TAGS.EDUCATION, 'max');

      return { success: true, data: education };
    });
  } catch (error: any) {
    logger.error(`Update education error: ${error.message}`);
    return {
      success: false,
      errorMsg: error.message || 'Failed to update educationSchema',
    };
  }
}
