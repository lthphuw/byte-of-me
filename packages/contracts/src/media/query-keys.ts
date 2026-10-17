export const mediaKeys = {
  all: ['media'] as const,
  library: (page: number) => [...mediaKeys.all, 'library', page] as const,
  infinite: (limit: number) => [...mediaKeys.all, 'infinite', limit] as const,
};
