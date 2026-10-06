export const projectKeys = {
  all: ['project'] as const,
  publicList: (
    page: number,
    filters: { tagSlugs: string[]; techStackSlugs: string[]; search: string }
  ) => [...projectKeys.all, 'public-list', page, filters] as const,
  adminList: () => [...projectKeys.all, 'admin-list'] as const,
  /** One page of the admin list: the key the server prefetch and the manager share. */
  adminPage: (page: number) => [...projectKeys.adminList(), page] as const,
  /**
   * Picker options. Nested under `adminList` so the manager's invalidation of
   * that root also refreshes them; `locale` because the titles are resolved
   * server-side.
   */
  options: (locale: string) =>
    [...projectKeys.adminList(), 'options', locale] as const,
};
