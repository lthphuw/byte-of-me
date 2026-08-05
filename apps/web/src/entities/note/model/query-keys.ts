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
  /**
   * ONE LEVEL of the tree — `parentId: null` is the root level. The explorer
   * loads a folder's children when it expands, so each level is its own cache
   * entry and a collapsed folder costs nothing.
   */
  children: (parentId: string | null, includeArchived: boolean) =>
    [...noteKeys.all, 'children', includeArchived, parentId] as const,
  /** Prefix-matches every level. What a create/move/archive invalidates: the
   *  row moved between two levels and neither id is worth working out. */
  childrenAll: () => [...noteKeys.all, 'children'] as const,

  /** The flat view's cursor-paginated document list. */
  page: (includeArchived: boolean, sort: string) =>
    [...noteKeys.all, 'page', includeArchived, sort] as const,
  pageAll: () => [...noteKeys.all, 'page'] as const,

  /** The grouped view's bucket list — keys, titles and TRUE counts. */
  groups: (groupBy: string, includeArchived: boolean) =>
    [...noteKeys.all, 'groups', includeArchived, groupBy] as const,
  groupsAll: () => [...noteKeys.all, 'groups'] as const,
  /** Rows inside one bucket, fetched when that section expands. */
  groupRows: (groupBy: string, key: string, includeArchived: boolean) =>
    [...noteKeys.all, 'group-rows', includeArchived, groupBy, key] as const,
  groupRowsAll: () => [...noteKeys.all, 'group-rows'] as const,

  /** How many notes a permanent delete would take with it. Fetched when the
   *  actions menu opens, because a collapsed folder's subtree is not loaded. */
  descendantCount: (noteId: string) =>
    [...noteKeys.all, 'descendant-count', noteId] as const,

  /** The owner's label list — one entry, names/colors for every consumer. */
  labels: () => [...noteKeys.all, 'labels'] as const,

  /**
   * Every key that renders a LIST of notes, for a mutation that changed which
   * notes exist or what a row says about one.
   *
   * This exists because the keys do not nest: `tree` is `[…, 'tree', …]` and
   * the per-level reads are `[…, 'children', …]`, so invalidating the first
   * cannot match the second. When the explorer moved to loading one level at
   * a time, every `invalidateQueries(noteKeys.tree(...))` call site silently
   * stopped refreshing the sidebar — create a note and nothing appeared until
   * a reload. Enumerating the family in one place is what stops the next key
   * from being forgotten the same way.
   *
   * Deliberately EXCLUDES `detail` and `search`: `use-note-editor-autosave`
   * documents at length why refetching the open note's detail around a
   * debounced save reopens a save loop.
   */
  lists: () =>
    [
      noteKeys.tree(false),
      noteKeys.tree(true),
      noteKeys.childrenAll(),
      noteKeys.pageAll(),
      noteKeys.groupsAll(),
      noteKeys.groupRowsAll(),
    ] as const,
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
