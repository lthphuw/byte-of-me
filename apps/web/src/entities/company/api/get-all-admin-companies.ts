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
        translations: true,
        techStacks: true,
        roles: {
          include: {
            translations: true,
            tasks: {
              include: {
                translations: true,
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
