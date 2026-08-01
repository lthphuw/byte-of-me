export const blogKeys = {
  all: ['blog'] as const,
  publicList: (page: number, filters: { tagSlugs: string[]; search: string }) =>
    [...blogKeys.all, 'public-list', page, filters] as const,
  /** Admin-only variant of the public list that also shows drafts. */
  publicListWithDrafts: (
    page: number,
    filters: { tagSlugs: string[]; search: string }
  ) => [...blogKeys.publicList(page, filters), 'with-drafts'] as const,
  adminList: () => [...blogKeys.all, 'admin-list'] as const,
  /** Full blog (content included) fetched on demand when the editor opens. */
  detail: (blogId: string) => [...blogKeys.all, 'detail', blogId] as const,
  stats: (blogId: string) => [...blogKeys.all, 'stats', blogId] as const,
  like: (blogId: string) => [...blogKeys.all, 'like', blogId] as const,
  clap: (blogId: string) => [...blogKeys.all, 'clap', blogId] as const,
};
