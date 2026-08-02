/**
 * The only source of TanStack query keys for notes. Never write an inline key
 * literal: a server prefetch and the `useQuery` that hydrates from it must call
 * the same function with the same arguments, and a mismatch does not raise —
 * it silently falls through to a client fetch and leaves skeletons on screen.
 */
export const noteKeys = {
  all: ['note'] as const,
  tree: (includeArchived: boolean) =>
    [...noteKeys.all, 'tree', includeArchived] as const,
  detail: (noteId: string) => [...noteKeys.all, 'detail', noteId] as const,
  search: (query: string, page: number) =>
    [...noteKeys.all, 'search', query, page] as const,
  /** Prefix-matches every `search(query, page)` key, for the one caller that
   *  needs to invalidate the whole search cache without naming a specific
   *  query/page pair — see `note-tree-panel.tsx`'s create mutation. */
  searchAll: () => [...noteKeys.all, 'search'] as const,
};
