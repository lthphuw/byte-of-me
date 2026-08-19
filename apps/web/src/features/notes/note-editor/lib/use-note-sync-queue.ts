'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import {
  deleteLocalNote,
  getAdminNoteById,
  listDirtyLocalNotes,
  markLocalNoteSynced,
  noteKeys,
  updateNote,
} from '@/entities/note';

/**
 * Sends notes the browser is still holding edits for.
 *
 * The counterpart to `use-note-editor-autosave`'s write-through. That hook
 * stores every buffer before it tries the network, which means a save that
 * failed — offline, a dead tab, a request cut off as the window closed —
 * leaves a record behind marked dirty. Nothing was reading those records back
 * until this existed, so the safety net caught the edit and then never handed
 * it over.
 *
 * Runs once on mount and again on every `online` event. Mount matters as much
 * as the event: the usual way a failed save is noticed is that the author
 * comes back later and reopens the app, by which time `online` has long since
 * fired and been missed.
 */
export function useNoteSyncQueue(openNoteId: string | null) {
  const t = useTranslations('dashboard.note');
  const queryClient = useQueryClient();

  // Read inside the drain rather than closed over, so a note the author opens
  // WHILE a drain is running is still skipped by the remaining iterations.
  const openNoteIdRef = useRef(openNoteId);
  openNoteIdRef.current = openNoteId;

  // Same reason `use-note-editor-autosave` keeps `tRef`: the effect below
  // deliberately does not re-run per render, so it must not close over
  // whichever `t` existed when it was declared.
  const tRef = useRef(t);
  tRef.current = t;

  const drain = useCallback(async () => {
    const dirty = await listDirtyLocalNotes();
    if (dirty.length === 0) return;

    let sent = 0;

    for (const local of dirty) {
      // The open note belongs to the editor: it has its own debounce, its own
      // conflict banner, and a buffer the author may still be typing into.
      // Sending the stored copy from here would race all three, and could
      // resolve a conflict the banner is still asking about.
      if (local.id === openNoteIdRef.current) continue;

      // What the server currently holds, BEFORE writing anything. One extra
      // read per dirty note, which costs nothing in practice because a dirty
      // note means a save that failed, and those are rare — while pushing
      // without looking is wrong in two distinct ways:
      //
      //  - The note may be GONE, deleted from another device. `updateNote`
      //    would fail, the loop would break on it, and because the record
      //    stays dirty it would break on the same note on every future drain
      //    — one deleted note jamming the queue for every other. Its local
      //    copy is dropped here instead, which is also the only thing that
      //    ever cleans up after a delete made elsewhere.
      //
      //  - The server row may have MOVED ON, which is precisely the conflict
      //    `use-note-editor-autosave`'s banner exists to put to the author.
      //    Pushing here would answer that question silently and in favour of
      //    this browser — reintroducing, through the back door, the exact
      //    loss the banner was built to prevent. Left dirty on purpose: the
      //    editor raises the banner the moment the note is opened.
      const current = await getAdminNoteById(local.id);

      if (!current.success) {
        await deleteLocalNote(local.id);
        continue;
      }

      if (current.data.updatedAt.getTime() > local.baseUpdatedAt) continue;

      const res = await updateNote({
        id: local.id,
        title: local.detail.title,
        content: local.detail.content,
      });

      // Stop at the FIRST failure rather than pressing on. The overwhelmingly
      // likely cause is that the network is still down or the session has
      // expired, in which case every remaining note would fail the same way —
      // and each attempt is a full server action. They stay dirty and the next
      // `online` event tries again.
      if (!res.success) break;

      await markLocalNoteSynced(local.id, {
        title: res.data.title,
        content: res.data.content,
        updatedAt: res.data.updatedAt.getTime(),
      });
      queryClient.setQueryData(noteKeys.detail(local.id), res.data);
      sent += 1;
    }

    if (sent === 0) return;

    // Titles may have moved, so the views that draw rows have to re-read.
    // `listLabels()` for the reason its own comment gives — nothing here
    // changes the shape of the tree, only what a row says.
    for (const queryKey of noteKeys.listLabels()) {
      void queryClient.invalidateQueries({ queryKey });
    }
    void queryClient.invalidateQueries({ queryKey: noteKeys.linksAll() });
    void queryClient.invalidateQueries({ queryKey: noteKeys.graph() });

    // Announced rather than silent: these are edits the author had every
    // reason to believe were lost, and a recovery nobody is told about is
    // indistinguishable from one that did not happen.
    toast.success(tRef.current('sync.recovered', { count: sent }));
  }, [queryClient]);

  useEffect(() => {
    // Guards against two drains overlapping — a reconnect that fires while
    // the mount drain is still working through the queue would otherwise send
    // the same note twice.
    let running = false;

    const run = () => {
      if (running) return;
      running = true;
      void drain().finally(() => {
        running = false;
      });
    };

    run();
    window.addEventListener('online', run);
    return () => window.removeEventListener('online', run);
  }, [drain]);
}
