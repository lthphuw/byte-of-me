'use server';

import { Company } from '@/models/company';

import { ApiActionResponse } from '@/types/api/api-action.type';
import { getTranslatedContent } from '@/lib/i18n';

import {
  handlePublicAction,
  withPublicActionHandler,
} from './public-action-template';

export async function getCompanies(): Promise<ApiActionResponse<Company[]>> {
  return handlePublicAction('getCompanies', async () => {
    const data = await withPublicActionHandler(
      'getCompanies',
      async ({ email, locale, prisma }) => {
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

        const companies: Company[] = resp.workExperiences.map((we) => {
          const translated = getTranslatedContent(we.translations, locale);

          return {
            id: we.id,
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
