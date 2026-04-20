'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import { revalidateTag } from 'next/cache';

import type { EducationFormValues } from '@/entities/education/model/education-schema';
import { requireAdmin } from '@/shared/lib/auth';
import { CACHE_TAGS } from '@/shared/lib/constants';
import type { ApiResponse } from '@/shared/types/api/api-response.type';





export async function createEducation(
  values: EducationFormValues
): Promise<ApiResponse<Any>> {
  try {
    const user = await requireAdmin();

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

    revalidateTag(CACHE_TAGS.EDUCATION, 'max');
    return { success: true, data: education };
  } catch (error: Any) {
    logger.error(`Create education error: ${error.message}`);
    return {
      success: false,
      errorMsg: error.message || 'Failed to create educationSchema',
    };
  }
}
