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
import { parseInput } from '@/shared/lib/validate-action-input';
import type { ApiResponse } from '@/shared/types/api/api-response.type';





export async function createEducation(
  input: EducationFormValues
): Promise<ApiResponse<Education>> {
  try {
    const user = await requireAdmin();

    const parsed = parseInput(educationSchema, input);
    if (!parsed.ok) {
      return { success: false, errorMsg: parsed.errorMsg };
    }
    const values = parsed.data;

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
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to create education');
    logger.error(`Create education error: ${errorMsg}`);
    return {
      success: false,
      errorMsg,
    };
  }
}
