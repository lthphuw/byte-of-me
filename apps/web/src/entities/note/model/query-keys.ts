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
  links: (noteId: string) => [...noteKeys.all, 'links', noteId] as const,
  /** Prefix-matches every `links(noteId)` key. A save rewrites the saved
   *  note's outgoing links, which changes some OTHER note's backlinks — and
   *  the id of that other note is not knowable from the save alone. */
  linksAll: () => [...noteKeys.all, 'links'] as const,
  /** The owner's label list — one entry, names/colors for every consumer. */
  labels: () => [...noteKeys.all, 'labels'] as const,
  /**
   * The whole knowledge graph — one entry.
   *
   * Invalidated by anything that changes the NODE set (create, archive,
   * restore, delete — see `useInvalidateNoteLists`) or the EDGE set (any
   * save, since `updateNote` rewrites the note's outgoing links from the
   * document).
   *
   * Deliberately NOT invalidated by status or label edits. `NoteGraphNode`
   * carries both fields, but nothing in the renderer draws them yet, so a
   * refetch of the entire graph on every drag between grouped-view buckets
   * would buy no visible change. Whoever first colours nodes by status or
   * label has to add it to `use-note-properties.ts` and `use-note-dnd.ts`.
   */
  graph: () => [...noteKeys.all, 'graph'] as const,
  search: (query: string, page: number) =>
    [...noteKeys.all, 'search', query, page] as const,
  /** Prefix-matches every `search(query, page)` key, for the one caller that
   *  needs to invalidate the whole search cache without naming a specific
   *  query/page pair — see `note-tree-panel.tsx`'s create mutation. */
  searchAll: () => [...noteKeys.all, 'search'] as const,
};
