export const tagKeys = {
  all: ['tag'] as const,
  adminList: () => [...tagKeys.all, 'admin-list'] as const,
  /** Admin tag page used to populate select/multi-select options. */
  options: (page: number) => [...tagKeys.all, 'options', page] as const,
  infinite: (limit: number) => [...tagKeys.all, 'infinite', limit] as const,
};
