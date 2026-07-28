export const projectKeys = {
  all: ['project'] as const,
  publicList: (
    page: number,
    filters: { tagSlugs: string[]; techStackSlugs: string[]; search: string }
  ) => [...projectKeys.all, 'public-list', page, filters] as const,
  adminList: () => [...projectKeys.all, 'admin-list'] as const,
  /** Full admin list used to populate select/multi-select options. */
  options: () => [...projectKeys.all, 'options'] as const,
};
