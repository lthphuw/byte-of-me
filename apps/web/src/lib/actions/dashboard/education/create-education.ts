'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import { ApiActionResponse } from '@/types/api/api-action.type';
import { requireUser } from '@/lib/auth/session';
import { EducationFormValues } from '@/lib/schemas/education.schema';

export async function createEducation(
  values: EducationFormValues
): Promise<ApiActionResponse<any>> {
  try {
    const user = await requireUser();

    const education = await prisma.education.create({
      data: {
        sortOrder: values.sortOrder,
        startDate: new Date(values.startDate),
        endDate: values.endDate ? new Date(values.endDate) : null,

        user: {
          connect: { id: user.id },
        },

        logo: values.logoId ? { connect: { id: values.logoId } } : undefined,

        translations: {
          create: values.translations.map((t) => ({
            language: t.language,
            title: t.title,
            description: t.description,
          })),
        },

        achievements: {
          create: values.achievements.map((a) => ({
            sortOrder: a.sortOrder,

            translations: {
              create: a.translations.map((t) => ({
                language: t.language,
                title: t.title,
                content: t.content,
              })),
            },

            images: {
              create: a.imageIds.map((id) => ({
                media: { connect: { id } },
              })),
            },
          })),
        },
      },
    });

    return { success: true, data: education };
  } catch (error: any) {
    logger.error(`Create education error: ${error.message}`);
    return {
      success: false,
      errorMsg: error.message || 'Failed to create education',
    };
  }
}
