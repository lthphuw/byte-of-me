export const companyKeys = {
  all: ['company'] as const,
  adminList: () => [...companyKeys.all, 'admin-list'] as const,
  /** One page of the admin list: the key the server prefetch and the manager share. */
  adminPage: (page: number) => [...companyKeys.adminList(), page] as const,
  /** Full record (roles and tasks included) fetched on demand when the editor opens. */
  detail: (companyId: string) =>
    [...companyKeys.all, 'detail', companyId] as const,
};
