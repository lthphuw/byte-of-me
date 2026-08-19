'use client';

import type { QueryClient } from '@tanstack/react-query';

/**
 * Identifies the permanent delete in the MUTATION cache.
 *
 * The same mechanism, and for the same reason, as
 * `CREATE_NOTE_MUTATION_KEY` in `use-note-mutations.ts`: the component that
 * needs the answer is not the one that asked for the delete, and a prop
 * cannot carry it — see `hasNoteBeenDeleted` below.
 *
 * It lives in the ENTITY rather than beside the mutation because both sides
 * of the question are features (`note-actions` writes it, `note-editor` reads
 * it), and a feature importing a sibling feature is the sideways import
 * AGENTS §3 rules out.
 */
export const DELETE_NOTE_MUTATION_KEY = ['note', 'delete'] as const;

/**
 * Has this browser just deleted this note?
 *
 * The editor's departure flush has to tell two things apart that arrive as
 * the SAME React unmount: "this pane is going away, send whatever the
 * debounce has not sent yet" and "this note was deleted out from under me,
 * send nothing". Without the distinction, deleting the open note mid-edit
 * fires an `updateNote` at a row that no longer exists and the author reads
 * a red "Failed to save" one beat after "Note deleted".
 *
 * The signal is established in `remove.onSuccess`, i.e. before the state
 * change that unmounts the editor — this only READS it, on the way out.
 *
 * `status !== 'error'` rather than `=== 'success'`, and that is not a
 * looseness. `Mutation.execute` dispatches `success` only AFTER awaiting
 * `options.onSuccess`, so throughout the callback that closes the editor the
 * mutation still reads `pending`; requiring `success` would answer `false` at
 * exactly the moment this is asked. Excluding `error` is what keeps a delete
 * that FAILED — the note still exists, and the author's unsent edit still
 * belongs to it — from disarming a later, legitimate flush.
 *
 * Deliberately NOT inferred from the detail query cache being empty, which
 * `remove.onSuccess` also arranges and which would have needed no new
 * mechanism at all. An empty cache entry says what this browser currently
 * HOLDS, not whether the note still exists: `use-relabel-inbound-links.ts`
 * already reaches for `removeQueries(noteKeys.detailAll())` and is kept off
 * the open note only by its `type: 'inactive'` filter, and gc expiry reaches
 * the same state on its own. Reading that as "deleted" fails in the direction
 * of silently dropping the author's unsent edit, which is the one outcome
 * this whole file exists to prevent.
 */
export function hasNoteBeenDeleted(
  queryClient: QueryClient,
  noteId: string
): boolean {
  const deletion = queryClient.getMutationCache().find({
    mutationKey: DELETE_NOTE_MUTATION_KEY,
    exact: true,
    predicate: (mutation) =>
      mutation.state.variables === noteId && mutation.state.status !== 'error',
  });

  return deletion !== undefined;
}
