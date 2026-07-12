'use server';

import { type Company, prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import { revalidateTag } from 'next/cache';

import type { CompanyFormValues } from '@/entities/company/model/company-schema';
import { requireAdmin } from '@/shared/lib/auth';
import { CACHE_TAGS } from '@/shared/lib/constants';
import { getErrorMessage } from '@/shared/lib/utils';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

export async function updateCompany(
  id: string,
  values: CompanyFormValues
): Promise<ApiResponse<Company>> {
  try {
    const user = await requireAdmin();

    return await prisma.$transaction(async (tx) => {
      const existing = await tx.company.findFirst({
        where: { id, userId: user.id },
        include: { roles: true },
      });

      if (!existing) {
        return { success: false, errorMsg: 'Company not found' };
      }

      const incoming = values.roles;

      const incomingIds = incoming
        .filter((r) => r.id)
        .map((r) => r.id as string);

      const toDelete = existing.roles
        .filter((r) => !incomingIds.includes(r.id))
        .map((r) => r.id);

      if (toDelete.length > 0) {
        await tx.role.deleteMany({
          where: { id: { in: toDelete } },
        });
      }

      const company = await tx.company.update({
        where: { id },
        data: {
          company: values.company,
          location: values.location,
          startDate: new Date(values.startDate),
          endDate: values.endDate ? new Date(values.endDate) : null,

          logo: values.logoId
            ? { connect: { id: values.logoId } }
            : { disconnect: true },

          translations: {
            deleteMany: {},
            create: values.translations.map((t) => ({
              language: t.language,
              description: t.description,
            })),
          },

          techStacks: {
            deleteMany: {},
            create: values.techStackIds.map((techStackId) => ({
              techStack: { connect: { id: techStackId } },
            })),
          },
        },
      });

      for (const r of incoming) {
        const roleData = {
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
        };

        if (!r.id) {
          // CREATE
          await tx.role.create({
            data: {
              companyId: id,
              ...roleData,
            },
          });
        } else {
          await tx.role.update({
            where: { id: r.id },
            data: {
              ...roleData,

              translations: {
                deleteMany: {},
                ...roleData.translations,
              },

              tasks: {
                deleteMany: {},
                ...roleData.tasks,
              },
            },
          });
        }
      }
      revalidateTag(CACHE_TAGS.COMPANY, 'max');

      return { success: true, data: company };
    });
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to update company');
    logger.error(`Update company error: ${errorMsg}`);
    return {
      success: false,
      errorMsg,
    };
  }
}
