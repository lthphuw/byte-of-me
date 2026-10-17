import type { INTERACTION } from '@byte-of-me/api-core';

export const blogKeys = {
  all: ['blog'] as const,
  publicList: (page: number, filters: { tagSlugs: string[]; search: string }) =>
    [...blogKeys.all, 'public-list', page, filters] as const,
  /**
   * Admin-only variant of the public list that also shows drafts. Its own root,
   * never a suffix of `publicList`, so invalidating one cannot touch the other.
   */
  publicListWithDrafts: (
    page: number,
    filters: { tagSlugs: string[]; search: string }
  ) => [...blogKeys.all, 'public-list-with-drafts', page, filters] as const,
  adminList: () => [...blogKeys.all, 'admin-list'] as const,
  /** One page of the admin list: the key the server prefetch and the manager share. */
  adminPage: (page: number) => [...blogKeys.adminList(), page] as const,
  /** Full blog (content included) fetched on demand when the editor opens. */
  detail: (blogId: string) => [...blogKeys.all, 'detail', blogId] as const,
  stats: (blogId: string) => [...blogKeys.all, 'stats', blogId] as const,
  /** The reader's own like or clap state, and the total for the post. */
  interaction: (blogId: string, kind: INTERACTION) =>
    [...blogKeys.all, 'interaction', kind, blogId] as const,
};
