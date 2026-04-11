'use server';

import { PublicCompany } from '@/entities/company/model/types';
import {
  handlePublicAction,
  withPublicActionHandler,
} from '@/shared/api/public-action-template';
import { getTranslatedContent } from '@/shared/lib/i18n-utils';
import { ApiResponse } from '@/shared/types/api/api-response.type';
import { prisma } from '@byte-of-me/db';

export async function getAllPublicCompanies(): Promise<
  ApiResponse<PublicCompany[]>
> {
  return handlePublicAction('getAllPublicCompanies', async () => {
    const data = await withPublicActionHandler(
      'getAllPublicCompanies',
      async ({ email, locale }) => {
        const resp = await prisma.user.findUniqueOrThrow({
          where: { email },
          include: {
            workExperiences: {
              include: {
                translations: true,
                logo: true,
                roles: {
                  include: {
                    translations: true,
                    tasks: {
                      include: {
                        translations: true,
                      },
                      orderBy: { sortOrder: 'desc' },
                    },
                  },
                },
              },
              orderBy: { startDate: 'desc' },
            },
          },
        });

        const companies: PublicCompany[] = resp.workExperiences.map((we) => {
          const translated = getTranslatedContent(we.translations, locale);

          return {
            id: we.id,
            createdAt: we.createdAt,
            updatedAt: we.updatedAt,
            company: we.company || '',
            location: we.location,
            description: translated?.description,
            startDate: we.startDate,
            endDate: we.endDate,
            logo: we.logo ?? null,
            roles: we.roles.map((r) => {
              const roleTranslated = getTranslatedContent(
                r.translations,
                locale
              );
              return {
                id: r.id,
                createdAt: r.createdAt,
                updatedAt: r.updatedAt,
                title: roleTranslated?.title || '',
                description: roleTranslated?.description || '',
                startDate: r.startDate,
                endDate: r.endDate,
                tasks: r.tasks.map((task) => {
                  const taskTranslated = getTranslatedContent(
                    task.translations,
                    locale
                  );
                  return {
                    id: task.id,
                    createdAt: task.createdAt,
                    updatedAt: task.updatedAt,
                    content: taskTranslated?.content || '',
                    sortOrder: task.sortOrder,
                  };
                }),
              };
            }),
          };
        });

        return companies;
      },
      {
        cache: true,
        cacheKey: ['work-experience-list'],
        cacheTags: ['work-experience'],
      }
    );
    return data;
  });
}
