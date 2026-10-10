export const featuredWorkKeys = {
  all: ['featured-work'] as const,
  adminList: () => [...featuredWorkKeys.all, 'admin-list'] as const,
  /** One page of the admin list: the key the server prefetch and the manager share. */
  adminPage: (page: number) => [...featuredWorkKeys.adminList(), page] as const,
  /** One full row for the editor. Outside `adminList()`; `useCrudManager`'s `detailKey` removes it on save. */
  detail: (id: string) => [...featuredWorkKeys.all, 'detail', id] as const,
};
