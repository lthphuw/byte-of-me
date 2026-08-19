'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toEditorContent } from '@byte-of-me/ui/lib/rich-text-content';
import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { updateSharedNote } from '@/entities/note-share';
import { useDepartureFlush } from '@/shared/hooks/use-departure-flush';

/** Matches the owner editor's default debounce; see `use-note-editor-autosave`. */
export const SHARED_AUTOSAVE_DELAY_MS = 800;

/**
 * Two versions of one shared note that cannot both be kept: what this reader
 * has typed but not landed, and a row somebody else moved on without them.
 *
 * Same shape and same treatment as the owner's `NoteEditConflict`, with one
 * genuine difference: the owner's is raised from a LOCAL copy marked dirty,
 * so it survives a reload. This one exists only in memory — see the hook's
 * note on why this surface keeps nothing locally — so it is raised by the
 * server refusing a save, and it lasts exactly as long as the reader stays.
 */
export interface SharedNoteEditConflict {
  /** When the version that beat this reader's save was written. */
  serverUpdatedAt: Date;
  /** When this reader last typed. */
  localEditedAt: Date;
  /** That other version's document, ready to seed the editor from if the
   *  reader takes it. Carried in the same object as the two timestamps so the
   *  banner and what "use theirs" applies can never describe different rows. */
  serverContent: string;
}

export interface UseSharedNoteAutosaveResult {
  /** An author edit. Records it and re-arms the debounce. */
  change: (content: string) => void;
  isSaving: boolean;
  isError: boolean;
  isSaved: boolean;
  /** Resends the buffer after a failure. Nothing else will: the buffer has
   *  not changed since, so no debounce is coming. */
  retry: () => void;
  /** The document to hand the rich-text editor, parsed once per seed. */
  seedValue: ReturnType<typeof toEditorContent>;
  /** Bumps on every reseed — a different note opening in this same component,
   *  and the reader accepting somebody else's version. The editor is
   *  uncontrolled after mount, so folding this into its `key` is the only way
   *  to make it show a document it was not mounted with. */
  seedGeneration: number;
  /** Non-null while the reader has an unanswered question on screen. Autosave
   *  is suspended for as long as it is. */
  conflict: SharedNoteEditConflict | null;
  /** The reader's answer. Takes the banner down either way. */
  resolveConflict: (choice: 'keep-mine' | 'take-server') => void;
}

/**
 * Debounced autosave for a note somebody else owns.
 *
 * Deliberately NOT `useNoteEditorAutosave`, and the reason is the security
 * boundary rather than taste. That hook is built on `getAdminNoteById` and
 * `updateNote`, both `requireAdmin()`-guarded owner actions a collaborator is
 * simply refused by; it keys `noteKeys`, reads the OWNER's workspace
 * settings, edits a title this surface does not expose, and reconciles
 * against a local vault a recipient does not have. Reusing it would mean
 * threading six injection points through a hook whose every comment reasons
 * about those concrete shapes — a rewrite of the dashboard's most delicate
 * file, and a `widgets/shared` → `features/dashboard` import across the
 * audience boundary AGENTS §3 draws to keep owner capability off a
 * recipient's route. What the two surfaces genuinely share is the DEPARTURE
 * itself, and that IS reused: `useDepartureFlush`, extracted from that hook
 * rather than copied out of it.
 *
 * **No local write-through, deliberately.** The owner's editor mirrors every
 * buffer into IndexedDB before the network attempt, which is right for notes
 * the author owns. This document is somebody else's, read on a machine that
 * may not be the reader's own, under a grant `revoke-note-share` can withdraw
 * at any moment — and `resolveNoteAccess` re-derives that grant on every
 * single read precisely so access is never something a client gets to hold
 * onto. A browser-local copy would outlive the revocation and survive sign
 * out, trading the owner's control away for durability. Writing into the
 * OWNER's store (`note-local-store.ts`) would be worse still:
 * `use-note-sync-queue` drains it through `getAdminNoteById`, would be
 * refused for a note this browser does not own, and its "gone from the
 * server, drop the local copy" branch would then delete the recipient's
 * unsent edit outright.
 *
 * So durability here is entirely "make the send unmissable and the failure
 * loud": flush on every departure, and report through a toast, which the root
 * `Toaster` renders and which therefore outlives this component — unlike the
 * inline status line, which unmounts with it.
 *
 * **Concurrency.** `updateSharedNote` now writes only over the row this
 * buffer was built on (`baseRef`), so a second editor can no longer be
 * overwritten without anyone being told. What that CANNOT see is stated
 * beside `baseRef` — the detection is per-save, not live, and the reader's
 * own version still only exists in this tab.
 */
export function useSharedNoteAutosave(
  noteId: string,
  initialContent: string,
  initialUpdatedAt: Date
): UseSharedNoteAutosaveResult {
  const t = useTranslations('share.note');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** The latest text the author has typed, always current — read
   *  synchronously by the flush below, which runs inside an effect cleanup
   *  where a state read would still be one render behind. */
  const bufferRef = useRef(initialContent);
  /** The last content handed to the server. Compared against `bufferRef` to
   *  decide whether a departure has anything to send at all, and put back on
   *  a failure so the next departure retries instead of believing a save that
   *  never landed. */
  const sentRef = useRef(initialContent);
  /**
   * The server row every send is made ON TOP OF, as milliseconds.
   *
   * Seeded from the read that opened the note and advanced by each save's own
   * response, which is the only reason that response has to carry `updatedAt`
   * at all: a base left behind would make the next save conflict with this
   * reader's own previous one.
   *
   * What this catches: another editor, or the owner, writing the note between
   * this reader opening it and their save landing. What it does NOT catch:
   * (1) a change made while this reader is only reading — nothing is compared
   * until they save, so there is no live "somebody else is editing" signal;
   * (2) two writes inside the same millisecond, since `notes.updated_at` is
   * `TIMESTAMP(3)` and the guard is `lte`; (3) anything at all about WHAT
   * changed — the granularity is the whole document, so whichever version the
   * reader keeps, the other is discarded entire.
   */
  const baseRef = useRef(initialUpdatedAt.getTime());
  /** When the author last typed, for the banner to name. A ref, not state:
   *  every keystroke would otherwise re-render the editor's whole column. */
  const editedAtRef = useRef(0);

  // Only so the status line can say "Saving…" during the debounce window,
  // before any request exists. Every decision to send is made from the refs.
  const [isDirty, setIsDirty] = useState(false);

  // Parsed once per seed rather than per render. `toEditorContent`, not
  // `JSON.parse`: a note stored before the editor existed holds plain text,
  // which `JSON.parse` throws on and this turns into a paragraph.
  const [seedValue, setSeedValue] = useState<
    ReturnType<typeof toEditorContent>
  >(() => toEditorContent(initialContent));
  const [seedGeneration, setSeedGeneration] = useState(0);

  const [conflict, setConflict] = useState<SharedNoteEditConflict | null>(null);
  // The same fact, readable synchronously. `commit` and the departure flush
  // both run outside a render — from a timer and from an effect cleanup — so
  // neither can read the state above without being one render behind.
  const conflictRef = useRef(false);
  conflictRef.current = conflict !== null;

  // Same reason `use-note-editor-autosave` keeps a `tRef`: the callbacks
  // below deliberately do not re-arm per render, so they must not close over
  // whichever bound `t` happened to exist when they were declared.
  const tRef = useRef(t);
  tRef.current = t;

  /**
   * The one place a save leaves this surface, and the one place a failure is
   * reported.
   *
   * Both matter. One send path is what stops the debounced save and the
   * departure flush drifting apart. One report path is what makes a failure
   * visible even when it lands after this component is gone: this runs inside
   * `mutationFn`, which the mutation itself invokes, rather than in
   * `onError`, which belongs to an observer that dies with the component —
   * and a dead observer's callbacks never fire. That is the same constraint
   * `use-note-editor-autosave`'s flush documents; it just resolves it by
   * putting the reporting where it always runs instead of by having two.
   *
   * Returns the error message rather than throwing, so the flush path can
   * call it without producing an unhandled rejection.
   */
  const send = useCallback(
    async (
      id: string,
      content: string,
      previous: string,
      /** True when the caller is a departure, i.e. when the banner this would
       *  otherwise raise is about to unmount unseen. */
      onDeparture: boolean
    ) => {
      const res = await updateSharedNote({
        id,
        content,
        baseUpdatedAt: baseRef.current,
      });

      if (!res.success) {
        sentRef.current = previous;
        setIsDirty(true);
        toast.error(tRef.current('errors.save'), { description: res.errorMsg });
        return res.errorMsg;
      }

      if (res.data.status === 'conflict') {
        // Nothing was written, so the buffer is still owed a save — the same
        // restore a refusal does, for the same reason.
        sentRef.current = previous;
        setIsDirty(true);
        setConflict({
          serverUpdatedAt: res.data.serverUpdatedAt,
          localEditedAt: new Date(editedAtRef.current || Date.now()),
          serverContent: res.data.serverContent,
        });

        // A departure has no banner to show: this component is on its way out
        // and the reader is owed the news somewhere that outlives it. Not an
        // `errorMsg` toast — nothing failed — but still loud, because their
        // version is about to exist nowhere.
        if (onDeparture) {
          toast.error(tRef.current('errors.conflict'));
        }
        return null;
      }

      baseRef.current = res.data.updatedAt.getTime();
      // Against the buffer as it stands NOW, not against what was sent: the
      // author may have typed again while this was in flight, and that edit
      // is still owed a save.
      setIsDirty(bufferRef.current !== sentRef.current);
      return null;
    },
    []
  );

  const save = useMutation({
    mutationFn: async (variables: {
      id: string;
      content: string;
      previous: string;
    }) => {
      const errorMsg = await send(
        variables.id,
        variables.content,
        variables.previous,
        false
      );
      // Thrown purely to put the mutation into `isError` for the status line.
      // The author has already been told by `send`.
      if (errorMsg) throw new Error(errorMsg);
    },
  });

  const { mutate: saveNote } = save;

  const commit = useCallback(
    (id: string) => {
      // Suspended while a conflict is unanswered, the way the owner's autosave
      // effect is: the server would refuse this send with the same stale base,
      // and rebasing it here would answer `keep-mine` on the reader's behalf.
      if (conflictRef.current) return;
      const content = bufferRef.current;
      if (content === sentRef.current) return;
      const previous = sentRef.current;
      sentRef.current = content;
      saveNote({ id, content, previous });
    },
    [saveNote]
  );

  /**
   * Sends whatever is in the buffer right now, bypassing the debounce.
   *
   * Not routed through `save.mutate` for the reason
   * `use-note-editor-autosave`'s own flush records: the mutation observer
   * belongs to a component that may be unmounting as this runs. Here that
   * only costs the status line — `send` above owns the reporting either way.
   *
   * `updateSharedNote` is a server action, i.e. an ordinary `fetch` that
   * cannot carry `keepalive`, so a request started on `pagehide` is
   * best-effort and the browser may still cut it off. Best-effort is the
   * whole gain over what this surface did before, which was `clearTimeout`
   * and nothing else.
   */
  const flushPending = useCallback(
    (departingId: string) => {
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
      }

      // The one departure this cannot rescue, stated plainly: with a conflict
      // still on screen there is no send that is safe to make unasked —
      // sending on the old base is refused, and sending on the new one throws
      // away the other editor's paragraph without anyone choosing that. With
      // no local copy by design, the reader's version goes with the tab. The
      // banner is what they had to answer.
      if (conflictRef.current) return;

      const content = bufferRef.current;
      if (content === sentRef.current) return;
      const previous = sentRef.current;
      sentRef.current = content;

      void send(departingId, content, previous, true);
    },
    [send]
  );

  /**
   * A different note opening in this same component.
   *
   * Declared ABOVE `useDepartureFlush` on purpose. React runs every effect's
   * cleanup for a commit before any of their setups, so the flush below
   * always reads `bufferRef`/`sentRef`/`baseRef` as they stood for the note
   * being LEFT — this reseed cannot get in front of it. That ordering is the
   * whole reason the workspace no longer has to remount this component to
   * change notes, which is what used to throw the editor's undo history away.
   */
  const seededNoteId = useRef(noteId);
  useEffect(() => {
    if (seededNoteId.current === noteId) return;
    seededNoteId.current = noteId;

    bufferRef.current = initialContent;
    sentRef.current = initialContent;
    baseRef.current = initialUpdatedAt.getTime();
    editedAtRef.current = 0;
    setSeedValue(toEditorContent(initialContent));
    setSeedGeneration((generation) => generation + 1);
    setIsDirty(false);
    // The previous note's disagreement says nothing about this one, and
    // leaving it up would suspend autosave on a note it was never about.
    setConflict(null);
  }, [noteId, initialContent, initialUpdatedAt]);

  // Covers the sibling-note click (which now changes this hook's key rather
  // than unmounting it, so the cleanup is still the last code that runs for
  // the departing note), the tab closing, and the tab being backgrounded. See
  // the hook itself for why no single one of those events is enough.
  useDepartureFlush(noteId, flushPending);

  const change = useCallback(
    (content: string) => {
      bufferRef.current = content;
      editedAtRef.current = Date.now();
      setIsDirty(content !== sentRef.current);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(
        () => commit(noteId),
        SHARED_AUTOSAVE_DELAY_MS
      );
    },
    [commit, noteId]
  );

  const retry = useCallback(() => {
    // No equality guard, unlike `commit`: after a failure `sentRef` has been
    // put back to the pre-send value, but nothing else will ever fire — the
    // buffer has not changed, so no debounce is coming.
    const content = bufferRef.current;
    const previous = sentRef.current;
    sentRef.current = content;
    saveNote({ id: noteId, content, previous });
  }, [noteId, saveNote]);

  /**
   * The reader's answer to the conflict banner.
   *
   * Either answer rebases onto the row they were actually shown, never onto
   * "whatever is current": anything written AFTER that row is a disagreement
   * they have not seen, and the server has to be allowed to raise it again.
   *
   * `keep-mine` SENDS, rather than re-arming the debounce and hoping — the
   * same reason the owner's version does. Nothing about the buffer changed
   * when they clicked, so the ordinary "is there anything new to send" check
   * would find it equal to `sentRef` and do nothing at all, leaving the edit
   * on screen looking saved forever.
   *
   * `take-server` discards their version. That is the honest shape of the
   * choice on this surface: there is no local copy to fall back on later, so
   * "use theirs" is not a deferral.
   */
  const resolveConflict = useCallback(
    (choice: 'keep-mine' | 'take-server') => {
      if (!conflict) return;
      baseRef.current = conflict.serverUpdatedAt.getTime();

      if (choice === 'take-server') {
        bufferRef.current = conflict.serverContent;
        sentRef.current = conflict.serverContent;
        setSeedValue(toEditorContent(conflict.serverContent));
        setSeedGeneration((generation) => generation + 1);
        setIsDirty(false);
      } else {
        const content = bufferRef.current;
        const previous = sentRef.current;
        sentRef.current = content;
        saveNote({ id: noteId, content, previous });
      }

      setConflict(null);
    },
    [conflict, noteId, saveNote]
  );

  // Scoped to the note on screen RIGHT NOW, for the reason the owner's hook
  // records: `save` is one observer shared by every note this component ever
  // opens, and now that a sibling click no longer remounts the component,
  // nothing resets it on a note change. Unscoped, a failure on note A left
  // "Not saved" and a Retry button sitting over note B — a button that would
  // have written B's own perfectly fine buffer back and reported the lost
  // edit on A as recovered.
  const isForCurrentNote = save.variables?.id === noteId;

  return {
    change,
    isSaving: (save.isPending && isForCurrentNote) || isDirty,
    isError: save.isError && isForCurrentNote,
    isSaved: save.isSuccess && isForCurrentNote && !isDirty,
    retry,
    seedValue,
    seedGeneration,
    conflict,
    resolveConflict,
  };
}
