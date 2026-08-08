/**
 * The only source of TanStack query keys for sharing. Never write an inline
 * key literal: a server prefetch and the `useQuery` that hydrates from it must
 * call the same function with the same arguments, and a mismatch does not
 * raise — it silently falls through to a client fetch and leaves skeletons on
 * screen (AGENTS §6).
 */
export const noteShareKeys = {
  all: ['note-share'] as const,

  /** The owner's grant list for one note, as the share dialog renders it. */
  shares: (noteId: string) => [...noteShareKeys.all, 'shares', noteId] as const,
  /** Prefix-matches every note's list. An invite, a role change and a revoke
   *  all change it, and the dialog is not always mounted on the note whose
   *  grants moved. */
  sharesAll: () => [...noteShareKeys.all, 'shares'] as const,

  /**
   * How many people a delete or a move would affect.
   *
   * Read on a DESTRUCTIVE path, so its consumers set `staleTime: 0` for the
   * reason `DeleteNoteDialog` records about `descendantCount`: a cached
   * number understates what is about to happen, and understating who loses
   * access is the wrong direction to be wrong in.
   */
  exposure: (noteId: string) =>
    [...noteShareKeys.all, 'exposure', noteId] as const,
  exposureAll: () => [...noteShareKeys.all, 'exposure'] as const,

  /** Whether moving `noteId` under `parentId` would expose it to anyone. */
  moveExposure: (noteId: string, parentId: string | null) =>
    [...noteShareKeys.all, 'move-exposure', noteId, parentId] as const,

  /** The recipient's inbox — everything shared with their address. */
  inbox: () => [...noteShareKeys.all, 'inbox'] as const,

  /** One shared document. */
  detail: (noteId: string) => [...noteShareKeys.all, 'detail', noteId] as const,

  /**
   * ONE LEVEL of the shared tree. Mirrors `noteKeys.children`: the tree loads
   * a folder's children when it expands, so each level is its own cache entry
   * and a collapsed folder costs nothing.
   */
  children: (parentId: string) =>
    [...noteShareKeys.all, 'children', parentId] as const,
  childrenAll: () => [...noteShareKeys.all, 'children'] as const,

  /** The breadcrumb, which stops at the share root. */
  ancestors: (noteId: string) =>
    [...noteShareKeys.all, 'ancestors', noteId] as const,
};
