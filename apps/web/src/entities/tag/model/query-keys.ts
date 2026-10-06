export const tagKeys = {
  all: ['tag'] as const,
  adminList: () => [...tagKeys.all, 'admin-list'] as const,
  /** One page of the admin list: the key the server prefetch and the manager share. */
  adminPage: (page: number) => [...tagKeys.adminList(), page] as const,
  /**
   * Picker options. Nested under `adminList` so the manager's invalidation of
   * that root also refreshes them; `locale` because the names are resolved
   * server-side.
   */
  options: (locale: string) =>
    [...tagKeys.adminList(), 'options', locale] as const,
  infinite: (limit: number) => [...tagKeys.all, 'infinite', limit] as const,
};
