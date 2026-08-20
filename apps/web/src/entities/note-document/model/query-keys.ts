/**
 * The only source of TanStack query keys for note attachments. Never write an
 * inline key literal: a server prefetch and the `useQuery` that hydrates from
 * it must call the same function with the same arguments, and a mismatch does
 * not raise — it silently falls through to a client fetch and leaves skeletons
 * on screen (AGENTS §6).
 *
 * Its own family rather than a branch of `noteKeys`: `note-share` already sets
 * the precedent that a sibling entity owns its keys, and an attachment upload
 * must not invalidate the note document itself — the editor's autosave
 * reconciles against `noteKeys.detail`, and making that key refetch around a
 * debounced save is what `use-note-editor-autosave.ts` documents at length.
 */
export const noteDocumentKeys = {
  all: ['note-document'] as const,

  /** One note's attachments, newest first, as the Files panel draws them. */
  list: (noteId: string) => [...noteDocumentKeys.all, 'list', noteId] as const,

  /**
   * Prefix-matches every note's list. Nothing needs it today — an upload and a
   * delete both know the note they happened on — but it is the escape hatch a
   * future cross-note move would reach for, and inventing a key literal at
   * that call site is the mistake this factory exists to prevent.
   */
  listAll: () => [...noteDocumentKeys.all, 'list'] as const,
};
