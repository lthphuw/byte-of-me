'use client';

import { useCallback, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { updateSharedNote } from '@/entities/note-share';
import { useDepartureFlush } from '@/shared/hooks/use-departure-flush';

/** Matches the owner editor's default debounce; see `use-note-editor-autosave`. */
export const SHARED_AUTOSAVE_DELAY_MS = 800;

export interface UseSharedNoteAutosaveResult {
  /** An author edit. Records it and re-arms the debounce. */
  change: (content: string) => void;
  isSaving: boolean;
  isError: boolean;
  isSaved: boolean;
  /** Resends the buffer after a failure. Nothing else will: the buffer has
   *  not changed since, so no debounce is coming. */
  retry: () => void;
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
 */
export function useSharedNoteAutosave(
  noteId: string,
  initialContent: string
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

  // Only so the status line can say "Saving…" during the debounce window,
  // before any request exists. Every decision to send is made from the refs.
  const [isDirty, setIsDirty] = useState(false);

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
    async (id: string, content: string, previous: string) => {
      const res = await updateSharedNote({ id, content });

      if (!res.success) {
        sentRef.current = previous;
        setIsDirty(true);
        toast.error(tRef.current('errors.save'), { description: res.errorMsg });
        return res.errorMsg;
      }

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
        variables.previous
      );
      // Thrown purely to put the mutation into `isError` for the status line.
      // The author has already been told by `send`.
      if (errorMsg) throw new Error(errorMsg);
    },
  });

  const { mutate: saveNote } = save;

  const commit = useCallback(
    (id: string) => {
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

      const content = bufferRef.current;
      if (content === sentRef.current) return;
      const previous = sentRef.current;
      sentRef.current = content;

      void send(departingId, content, previous);
    },
    [send]
  );

  // Covers the sibling-note click (which remounts this editor, so the
  // cleanup is the last code that ever runs for the departing note), the tab
  // closing, and the tab being backgrounded. See the hook itself for why no
  // single one of those events is enough.
  useDepartureFlush(noteId, flushPending);

  const change = useCallback(
    (content: string) => {
      bufferRef.current = content;
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

  return {
    change,
    isSaving: save.isPending || isDirty,
    isError: save.isError,
    isSaved: save.isSuccess && !isDirty,
    retry,
  };
}
