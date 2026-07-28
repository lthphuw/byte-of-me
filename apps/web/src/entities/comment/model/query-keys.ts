export const commentKeys = {
  all: ['comment'] as const,
  /**
   * One blog's comment thread. The shape stays `[root, blogId, limit]` (no
   * discriminator segment) so `threads(blogId)` prefix-invalidation matches
   * every limit variant.
   */
  thread: (blogId: string, limit: number) =>
    [...commentKeys.all, blogId, limit] as const,
  /** Prefix for every `thread` key of a blog, for invalidation. */
  threads: (blogId: Maybe<string>) => [...commentKeys.all, blogId] as const,
  adminAll: () => [...commentKeys.all, 'admin-list'] as const,
  adminList: (page: number) => [...commentKeys.adminAll(), page] as const,
};

/** @deprecated Alias kept for existing imports — use `commentKeys.thread`. */
export const commentKey = commentKeys.thread;
