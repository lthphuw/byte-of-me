import type { Prisma } from '@byte-of-me/db/types';

/**
 * The editor's full record. Roles, tasks and every translation live here only:
 * the list row below never carries them, so the dialog loads this by id
 * instead of reusing the row as `initialData`.
 */
export type AdminCompany = Prisma.CompanyGetPayload<{
  include: {
    translations: {
      select: {
        id: true;
        language: true;
        description: true;
      };
    };
    techStacks: { select: { techStackId: true } };
    roles: {
      include: {
        translations: {
          select: {
            id: true;
            language: true;
            title: true;
            description: true;
          };
        };
        tasks: {
          include: {
            translations: {
              select: {
                id: true;
                language: true;
                content: true;
              };
            };
          };
        };
      };
    };
  };
}>;

/**
 * One row of the paginated admin list: what the card renders (logo, name,
 * location, dates, role and tech-stack counts) and nothing nested below it.
 */
export type AdminCompanyListItem = Prisma.CompanyGetPayload<{
  include: {
    logo: { select: { url: true } };
    _count: { select: { roles: true; techStacks: true } };
  };
}>;

