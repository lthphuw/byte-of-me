export const techStackKeys = {
  all: ['tech-stack'] as const,
  list: () => [...techStackKeys.all, 'list'] as const,
  /**
   * Picker options. Nested under `list` so the manager's invalidation of the
   * list root also refreshes them: every tech-stack write reaches both.
   */
  options: () => [...techStackKeys.list(), 'options'] as const,
  infinite: (limit: number) =>
    [...techStackKeys.all, 'infinite', limit] as const,
  /** One full record for the edit dialog. Outside `list`: a save drops it through `keys.detail`. */
  detail: (id: string) => [...techStackKeys.all, 'detail', id] as const,
};
