'use server';

import { type Company, prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import { revalidateTag } from 'next/cache';

import {
  type CompanyFormValues,
  companySchema,
} from '@/entities/company/model/company-schema';
import { requireAdmin } from '@/shared/lib/auth';
import { CACHE_TAGS } from '@/shared/lib/constants';
import { getErrorMessage } from '@/shared/lib/utils';
import { idSchema, parseInput } from '@/shared/lib/validate-action-input';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

export async function updateCompany(
  id: string,
  input: CompanyFormValues
): Promise<ApiResponse<Company>> {
  try {
    const user = await requireAdmin();

    const parsedId = parseInput(idSchema, id);
    if (!parsedId.ok) {
      return { success: false, errorMsg: parsedId.errorMsg };
    }
    const parsed = parseInput(companySchema, input);
    if (!parsed.ok) {
      return { success: false, errorMsg: parsed.errorMsg };
    }
    const values = parsed.data;

    const result = await prisma.$transaction(
      async (tx): Promise<ApiResponse<Company>> => {
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

        // The role writes are independent of one another, so they run in
        // parallel inside the transaction.
        await Promise.all(
          incoming.map((r) => {
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
              return tx.role.create({
                data: {
                  companyId: id,
                  ...roleData,
                },
              });
            }

            return tx.role.update({
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
          })
        );

        return { success: true, data: company };
      }
    );

    // Revalidate only after the transaction has committed, so readers never
    // repopulate the cache from uncommitted (or rolled-back) state.
    if (result.success) {
      revalidateTag(CACHE_TAGS.COMPANY, 'max');
    }

    return result;
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to update company');
    logger.error(`Update company error: ${errorMsg}`);
    return {
      success: false,
      errorMsg,
    };
  }
}
