/** The public timeline's filters, as the URL carries them. */
export type PublicProjectFilters = {
  tagSlugs: string[];
  techStackSlugs: string[];
  search: string;
};

export const projectKeys = {
  all: ['project'] as const,
  publicList: (page: number, filters: PublicProjectFilters) =>
    [...projectKeys.all, 'public-list', page, filters] as const,
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
  /**
   * One full record for the edit dialog. Under `all`, so a save's root
   * invalidation reaches it; the manager then removes it.
   */
  detail: (id: string) => [...projectKeys.all, 'detail', id] as const,
};
