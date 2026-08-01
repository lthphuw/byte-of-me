'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import type { AdminCompany } from '@/entities/company/model/types';
import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

export async function getAllAdminCompanies(): Promise<
  ApiResponse<AdminCompany[]>
> {
  try {
    const user = await requireAdmin();

    const companies = await prisma.company.findMany({
      where: {
        userId: user.id,
      },
      include: {
        logo: true,
        // CompanyDialog reads `description` only (see AdminCompany).
        translations: {
          select: {
            id: true,
            language: true,
            description: true,
          },
        },
        techStacks: true,
        roles: {
          include: {
            // CompanyRoleItemField reads title/description only.
            translations: {
              select: {
                id: true,
                language: true,
                title: true,
                description: true,
              },
            },
            tasks: {
              include: {
                // CompanyRoleItemField's task rows read content only.
                translations: {
                  select: {
                    id: true,
                    language: true,
                    content: true,
                  },
                },
              },
              orderBy: {
                sortOrder: 'desc',
              },
            },
          },
          orderBy: {
            startDate: 'desc',
          },
        },
      },
      orderBy: {
        startDate: 'desc',
      },
    });

    return {
      success: true,
      data: companies,
    };
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to fetch companies');
    logger.error(`Get admin companies error: ${errorMsg}`);
    return {
      success: false,
      errorMsg,
    };
  }
}
