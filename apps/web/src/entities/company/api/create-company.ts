'use server';

import { type Company, prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import { revalidateTag } from 'next/cache';

import type { CompanyFormValues } from '@/entities/company/model/company-schema';
import { requireAdmin } from '@/shared/lib/auth';
import { CACHE_TAGS } from '@/shared/lib/constants';
import { getErrorMessage } from '@/shared/lib/utils';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

export async function createCompany(
  values: CompanyFormValues
): Promise<ApiResponse<Company>> {
  try {
    const user = await requireAdmin();

    const company = await prisma.company.create({
      data: {
        company: values.company,
        location: values.location,
        startDate: new Date(values.startDate),
        endDate: values.endDate ? new Date(values.endDate) : null,

        user: {
          connect: { id: user.id },
        },

        logo: values.logoId ? { connect: { id: values.logoId } } : undefined,

        translations: {
          create: values.translations.map((t) => ({
            language: t.language,
            description: t.description,
          })),
        },

        techStacks: {
          create: values.techStackIds.map((techStackId) => ({
            techStack: { connect: { id: techStackId } },
          })),
        },

        roles: {
          create: values.roles.map((r) => ({
            startDate: r.startDate ? new Date(r.startDate) : null,
            endDate: r.endDate ? new Date(r.endDate) : null,

            translations: {
              create: r.translations.map((t) => ({
                language: t.language,
                title: t.title,
                description: t.description,
              })),
            },

            tasks: {
              create: r.tasks.map((task) => ({
                sortOrder: task.sortOrder,

                translations: {
                  create: task.translations.map((t) => ({
                    language: t.language,
                    content: t.content,
                  })),
                },
              })),
            },
          })),
        },
      },
    });

    revalidateTag(CACHE_TAGS.COMPANY, 'max');
    return { success: true, data: company };
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to create company');
    logger.error(`Create company error: ${errorMsg}`);
    return {
      success: false,
      errorMsg,
    };
  }
}
