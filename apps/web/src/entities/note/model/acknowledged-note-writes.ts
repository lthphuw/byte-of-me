'use client';

/**
 * The newest server row this tab knows it produced ITSELF, per note.
 *
 * Same shape, and the same reason, as `deleted-notes.ts`: the component that
 * needs to know a write landed is not necessarily the one that sent it. The
 * editor is keyed on the open note (`note-manager.tsx` renders
 * `<NoteEditor key={activeId}>`), so switching away and back DESTROYS the
 * instance that issued a save while its request is still in flight. When the
 * response finally arrives, the callbacks that run belong to that dead
 * instance: its `queryClient.setQueryData` still lands, because the client is
 * global, but every `setState` it makes is a no-op — and the instance now on
 * screen has its own copy of the state that decides whether to raise a
 * conflict banner.
 *
 * That gap was a real, reproducible bug rather than a theoretical one. With a
 * local copy marked dirty at open, `use-note-editor-autosave.ts` records the
 * base those unsent edits sat on; the author's own save then advances the
 * server row past that base, which is indistinguishable — from inside the new
 * instance — from another device having written the note. The banner went up
 * for a conflict with nobody, and because the banner SUSPENDS autosave,
 * nothing the author typed from then on ever left the browser. Caught by
 * `note-editor.spec.tsx`'s keyed catch-up test the moment that suite was given
 * a working IndexedDB.
 *
 * A module-level record is what closes it, for the reason `deleted-notes.ts`
 * gives in its own words: a prop cannot carry this, and neither can state
 * belonging to a component that no longer exists. The alternative considered
 * was re-deriving the base from the local store — the genuinely shared source
 * of truth — but that store is written fire-and-forget from the same callback,
 * so the read races it, and making the banner wait on a confirmation read
 * would turn a value computed during render into async state that the reseed
 * timing in that hook is very deliberately built around.
 *
 * Grows by one entry per note this tab has SAVED — an id and a number, with
 * later saves overwriting rather than appending — and is never pruned, on the
 * same reasoning `deletedNoteIds` records: it is bounded by how many distinct
 * notes one author edits in one session, and forgetting an entry costs a
 * question the author should not have been asked, which is the failure this
 * exists to prevent.
 */
const acknowledgedUpdatedAt = new Map<string, number>();

/**
 * Records a write this browser made and the server accepted.
 *
 * `updatedAt` is the timestamp the SERVER stamped on the row it wrote, as
 * milliseconds — the same value that reaches `noteKeys.detail`. Acknowledged
 * writes only: a save that failed changed nothing, and a row that never moved
 * must not be able to explain away a newer one that did.
 *
 * Called with the id the save was FOR, never the caller's idea of which note
 * is open. Those two are exactly what come apart here.
 */
export function rememberAcknowledgedNoteWrite(
  noteId: string,
  updatedAt: number
): void {
  const previous = acknowledgedUpdatedAt.get(noteId) ?? 0;
  // `Math.max`, not a plain overwrite: two saves for one note can be in
  // flight at once (the whole reason `inFlightRef` exists in the autosave),
  // and they settle in whatever order the network returns them. An older
  // response landing last must not walk this backwards.
  if (updatedAt > previous) acknowledgedUpdatedAt.set(noteId, updatedAt);
}

/**
 * When this tab last wrote that note itself, or `0` if it never has.
 *
 * `0` rather than `undefined` so callers can fold it straight into a
 * comparison — every use is "is the row in front of me newer than something",
 * and a note this tab has never written is newer than nothing.
 */
export function acknowledgedNoteWriteAt(noteId: string): number {
  return acknowledgedUpdatedAt.get(noteId) ?? 0;
}

/**
 * Forgets every acknowledgement. Tests only, for the reason
 * `__resetNoteLocalStore` gives: this record is module state, so it outlives
 * the component AND the test that filled it, and Bun runs a whole spec file
 * in one process. A note id is a fixture reused by every test in a file —
 * without this, one test's save silently explains away the next test's
 * deliberately-newer server row, and a spec written to prove the conflict
 * banner still appears passes because it never could have.
 */
export function __resetAcknowledgedNoteWrites(): void {
  acknowledgedUpdatedAt.clear();
}
