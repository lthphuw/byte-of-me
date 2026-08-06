/**
 * The only source of TanStack query keys for notes. Never write an inline key
 * literal: a server prefetch and the `useQuery` that hydrates from it must call
 * the same function with the same arguments, and a mismatch does not raise —
 * it silently falls through to a client fetch and leaves skeletons on screen.
 */
export const noteKeys = {
  all: ['note'] as const,
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

  /**
   * The trash: archived notes, flat and newest-first. Its own key rather than
   * a variant of `children`, because an archived note can have a LIVE parent
   * and so belongs to no per-level read — see `getArchivedNotes`.
   */
  archived: () => [...noteKeys.all, 'archived'] as const,

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
  /** Prefix-matches every note's count — which note gained or lost a
   *  descendant is not knowable from a create or a move. */
  descendantCountAll: () => [...noteKeys.all, 'descendant-count'] as const,

  /** The chain of parents above a note, root first. Read by the editor
   *  header's breadcrumb, and by the explorer when it has to expand every
   *  collapsed folder on the path to a note opened from the palette or a
   *  `[[` link. */
  ancestors: (noteId: string) =>
    [...noteKeys.all, 'ancestors', noteId] as const,
  /** Prefix-matches every note's chain. A MOVE re-parents the moved note AND
   *  everything under it, and a folder RENAME relabels every crumb below it —
   *  in both cases the notes whose breadcrumb just changed are exactly the
   *  ones whose ids the mutation does not know. Same reason `childrenAll`
   *  exists. */
  ancestorsAll: () => [...noteKeys.all, 'ancestors'] as const,

  /** The owner's label list — one entry, names/colors for every consumer. */
  labels: () => [...noteKeys.all, 'labels'] as const,

  /**
   * Every key that renders a LIST of notes, for a mutation that changed which
   * notes exist or what a row says about one.
   *
   * This exists because the keys do not nest: `tree` is `[…, 'tree', …]` and
   * the per-level reads are `[…, 'children', …]`, so invalidating the first
   * cannot match the second. When the explorer moved to loading one level at
   * a time, every `invalidateQueries` call site aimed at the old `tree` key
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
      noteKeys.archived(),
      noteKeys.childrenAll(),
      noteKeys.pageAll(),
      noteKeys.groupsAll(),
      noteKeys.groupRowsAll(),
      // The delete confirmation's cascade count. It is read on a DESTRUCTIVE
      // path, so a stale one is not a cosmetic bug: understating what a
      // permanent delete takes is the worst direction to be wrong in.
      noteKeys.descendantCountAll(),
      // Breadcrumbs and the reveal path. A move re-parents a whole subtree
      // and a folder rename relabels every crumb beneath it, so a chain that
      // is not refetched shows a path the note no longer has. Safe in this
      // family for the reason `use-note-editor-autosave` gives for `links`:
      // nothing the save decision reads comes from it, so refetching cannot
      // loop back into another save.
      noteKeys.ancestorsAll(),
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
