export const techStackKeys = {
  all: ['tech-stack'] as const,
  list: () => [...techStackKeys.all, 'list'] as const,
  /** Full admin list used to populate select/multi-select options. */
  options: () => [...techStackKeys.all, 'options'] as const,
  infinite: (limit: number) =>
    [...techStackKeys.all, 'infinite', limit] as const,
};
