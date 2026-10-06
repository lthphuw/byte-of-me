'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import type { AdminCompany } from '@/entities/company/model/types';
import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';
import { idSchema, parseInput } from '@/shared/lib/validate-action-input';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

/**
 * The editor dialog's source of truth: list rows drop the roles and tasks, so
 * reusing one as `initialData` would let a save overwrite real content with none.
 */
export async function getAdminCompanyById(
  id: string
): Promise<ApiResponse<AdminCompany>> {
  try {
    const user = await requireAdmin();

    const parsedId = parseInput(idSchema, id);
    if (!parsedId.ok) {
      return { success: false, errorMsg: parsedId.errorMsg };
    }

    const company = await prisma.company.findFirst({
      where: { id, userId: user.id },
      include: {
        // CompanyDialog reads `description` only (see AdminCompany).
        translations: {
          select: { id: true, language: true, description: true },
        },
        techStacks: { select: { techStackId: true } },
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
                  select: { id: true, language: true, content: true },
                },
              },
              orderBy: { sortOrder: 'desc' },
            },
          },
          orderBy: { startDate: 'desc' },
        },
      },
    });

    if (!company) {
      return { success: false, errorMsg: 'Company not found' };
    }

    return { success: true, data: company };
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to fetch company');
    logger.error(`Get admin company by id error: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
