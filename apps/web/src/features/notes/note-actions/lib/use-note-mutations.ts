'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import {
  archiveNote,
  createNote,
  DELETE_NOTE_MUTATION_KEY,
  deleteLocalNote,
  deleteNote,
  noteKeys,
  rememberDeletedNotes,
  restoreNote,
  updateNote,
} from '@/entities/note';
import { useRelabelInboundLinks } from '@/features/notes/note-actions/lib/use-relabel-inbound-links';

/**
 * Why every callback below moves its navigation AHEAD of `invalidateLists()`.
 *
 * `router.push` and every server action share ONE queue in Next's app router
 * (`client/components/app-router-instance.js`). A navigation is dispatched
 * with priority: `dispatchAction` marks whatever is pending as `discarded`,
 * splices the navigation in ahead of it and runs it immediately — but it does
 * NOT move `actionQueue.last` onto the navigation. When the queue held exactly
 * one action (`pending === last`), `last` is left pointing at the discarded
 * node, which is no longer on the chain: every action dispatched from then
 * until the queue drains is appended to `discarded.next` and is never sent at
 * all. And because each dispatch hands React a fresh promise to wait on, React
 * ends up waiting on an orphan's — so the navigation's own resolved state
 * never commits and the URL never changes either.
 *
 * Measured in the browser with the queue traced, on "new note inside":
 * `createNote` → `getNoteChildren` (the only active level query; pending ===
 * last) → `navigate` (discards it, `last` left on the discarded node) →
 * `getAdminNoteById` and one further read dispatched and never issued. The
 * editor's own read never leaving the browser is why the pane sat on
 * `NoteEditorSkeleton` forever, and no `pushState` ever ran despite the
 * navigation's own RSC request coming back 200.
 *
 * Dispatching the navigation FIRST — the mutation's own action has just
 * resolved, so the queue is empty at that moment — takes the `pending === null`
 * branch instead, which does set `last`. The invalidations then chain off the
 * navigation and all run. It is also the order the path that always worked
 * (clicking a row that already exists) has used all along.
 */

/**
 * Invalidates every list a note can appear in, and only those.
 *
 * Both tree variants (a note leaving the live tree is a note joining the
 * archived one), plus the whole search cache — the empty-term search the
 * palette runs on open lists notes by `updatedAt desc` and must not keep
 * offering a note that has just been archived or deleted.
 *
 * `noteKeys.all` is deliberately NOT used: it prefix-matches `detail` too, and
 * `use-note-editor-autosave.ts` documents at length why a broad invalidation
 * that reaches `detail` is a hazard around a debounced save. These three
 * mutations are one-shot, but there is no reason to reach a key none of them
 * changes.
 */
function useInvalidateNoteLists() {
  const queryClient = useQueryClient();

  return () => {
    // The per-level reads, handed back so `useCreateNote` can keep its pending
    // row until the level has re-read. Only those: awaiting the whole family
    // would hold that row for the knowledge graph too. The rest is unchanged,
    // fire-and-forget.
    let levels: Promise<void> = Promise.resolve();

    // Every list-shaped key, not just the tree: the explorer now reads
    // per-level `children` keys, which `tree` does not prefix-match.
    for (const queryKey of noteKeys.lists()) {
      const refetched = queryClient.invalidateQueries({ queryKey });
      if (queryKey[1] === 'children') levels = refetched;
      else void refetched;
    }
    void queryClient.invalidateQueries({ queryKey: noteKeys.searchAll() });
    // Create/archive/restore/delete all change the NODE set the graph plots
    // — and deleting a note takes its links with it, so the edge set moves
    // too. The tree keys above cannot stand in for this: the graph excludes
    // folders and archived notes, so it is a different question entirely.
    void queryClient.invalidateQueries({ queryKey: noteKeys.graph() });

    return levels;
  };
}

/**
 * The keys that make a note mutation findable in the MUTATION CACHE.
 *
 * Every one of them exists for the same reason, and it is not cache
 * housekeeping: the component that needs to know a mutation is running is
 * usually not the one that started it. Radix unmounts a menu's content the
 * moment an item is chosen, taking the `useMutation` observer — and its
 * `isPending` — with it, so a `disabled` flag read off the observer is a
 * re-render that never happens. The cache outlives the observer, and
 * `useMutationState` / `useIsMutating` read it.
 *
 * Four here and one, `DELETE_NOTE_MUTATION_KEY`, in
 * `entities/note/model/deleted-notes.ts`. That split is deliberate rather than
 * a leftover: delete is the only one whose question is asked from ANOTHER
 * feature (`note-editor`'s departure flush), and a feature importing a sibling
 * feature is the sideways import AGENTS §3 rules out. The rest are read inside
 * this feature — by `use-note-action-items.tsx` — or from a widget above it,
 * which may import downward freely. Keys that are only used here belong here.
 */
export const CREATE_NOTE_MUTATION_KEY = ['note', 'create'] as const;
export const ARCHIVE_NOTE_MUTATION_KEY = ['note', 'archive'] as const;
export const RESTORE_NOTE_MUTATION_KEY = ['note', 'restore'] as const;
export const PIN_NOTE_MUTATION_KEY = ['note', 'pin'] as const;

interface UseNoteMutationsOptions {
  /**
   * Called once the note is gone from wherever it was — the caller decides
   * whether that means navigating away (the note was the one open) or nothing
   * at all (it was another row in the tree).
   *
   * Fired once per note the operation actually took, not once per click.
   * Archiving a folder cascades to its whole subtree, and the open note is as
   * likely to be a DESCENDANT of the archived row as to be the row itself —
   * see `archive` below.
   */
  onRemoved?: (noteId: string) => void;
}

export function useNoteMutations({ onRemoved }: UseNoteMutationsOptions = {}) {
  const t = useTranslations('dashboard.note');
  const queryClient = useQueryClient();
  const invalidateLists = useInvalidateNoteLists();

  const archive = useMutation({
    // Keyed for the row menus' `disabled` flag — see the key block above.
    mutationKey: ARCHIVE_NOTE_MUTATION_KEY,
    mutationFn: async (id: string) => {
      const res = await archiveNote(id);
      if (!res.success) throw new Error(res.errorMsg);
      // The whole cascade, not the id that was clicked — see below.
      return res.data;
    },
    onSuccess: (archivedIds) => {
      // EVERY archived id, because archiving cascades down the subtree and
      // the caller's "was this the note I have open?" test is an id
      // comparison. Reporting only the row that was clicked left the editor
      // open on a descendant that had just gone to the trash: the URL still
      // named it, the tree no longer listed it, and the autosave kept writing
      // into it — `updateNote` does not refuse an archived row. Closing the
      // editor is the behaviour a direct archive of the open note has always
      // had; which row the author clicked is an implementation detail of the
      // cascade, not a different intent.
      //
      // Ahead of the invalidation: archiving the OPEN note navigates away, and
      // a navigation dispatched behind a burst of server actions can be
      // stranded. See the note at the top of this file.
      for (const archivedId of archivedIds) onRemoved?.(archivedId);
      void invalidateLists();
      toast.success(t('toasts.archived'));
    },
    onError: (error: Error) => {
      toast.error(t('errors.archive'), { description: error.message });
    },
  });

  const restore = useMutation({
    mutationKey: RESTORE_NOTE_MUTATION_KEY,
    mutationFn: async (id: string) => {
      const res = await restoreNote(id);
      if (!res.success) throw new Error(res.errorMsg);
      return id;
    },
    onSuccess: () => {
      void invalidateLists();
      toast.success(t('toasts.restored'));
    },
    onError: (error: Error) => {
      toast.error(t('errors.restore'), { description: error.message });
    },
  });

  const pin = useMutation({
    // `updateNote` behind it, like the autosave and the properties panel —
    // but its own key, because what the menu asks is "is a PIN running", not
    // "is anything saving".
    mutationKey: PIN_NOTE_MUTATION_KEY,
    mutationFn: async (input: { id: string; isPinned: boolean }) => {
      const res = await updateNote(input);
      if (!res.success) throw new Error(res.errorMsg);
      return res.data;
    },
    onSuccess: (data) => {
      // Straight into the detail key, the way every other `updateNote`
      // caller applies its result (see `applySaveResult` in the autosave and
      // `useNoteProperties`) — the row differs from the buffer only in
      // `isPinned`/`updatedAt`, so the autosave's reseed guard stays inert.
      queryClient.setQueryData(noteKeys.detail(data.id), data);
      // Every list-shaped key, not just the tree: the explorer now reads
      // per-level `children` keys, which `tree` does not prefix-match.
      for (const queryKey of noteKeys.lists()) {
        void queryClient.invalidateQueries({ queryKey });
      }
    },
    onError: (error: Error) => {
      toast.error(t('errors.save'), { description: error.message });
    },
  });

  const remove = useMutation({
    // Keyed so the delete is findable in the MUTATION cache by note id. The
    // editor's departure flush is what asks: it runs on the unmount this
    // delete causes, and has no other way to tell "the pane is closing, send
    // what is pending" apart from "this note is gone, send nothing". See
    // `hasNoteBeenDeleted`.
    mutationKey: DELETE_NOTE_MUTATION_KEY,
    mutationFn: async (id: string) => {
      const res = await deleteNote(id);
      if (!res.success) throw new Error(res.errorMsg);
      // Recorded HERE rather than in `onSuccess`, and that placement is the
      // fix rather than a preference: the departure flush asks
      // `hasNoteBeenDeleted` from inside the very callback below (closing the
      // editor is what unmounts it), so anything established there is
      // established a beat too late for a DESCENDANT — whose id is not the
      // mutation's variable and so is invisible to the cache lookup. This
      // runs the instant the server answers, before any callback.
      rememberDeletedNotes(res.data);
      // The whole cascade, not the id that was clicked — see below.
      return res.data;
    },
    onSuccess: (deletedIds) => {
      for (const deletedId of deletedIds) {
        // `removeQueries`, not `invalidateQueries`: the note no longer exists,
        // so refetching its detail would just produce an error state for a
        // document nobody can open. Every id the cascade took, now that the
        // action names them — a stale detail entry for an unreachable note is
        // harmless, but leaving one behind means the editor can still be
        // handed a document that has been destroyed.
        queryClient.removeQueries({ queryKey: noteKeys.detail(deletedId) });
        // The browser's own copy goes too. A stale in-memory cache entry is
        // harmless; a stale IndexedDB record is not, because `useNoteSyncQueue`
        // reads those back and would try to resend a note that no longer
        // exists. The queue does drop any local copy the server no longer
        // returns, but that is a round trip and a failed save later; deleting
        // the descendants' copies outright is the same cleanup without it.
        void deleteLocalNote(deletedId);
        // EVERY deleted id, because a hard delete cascades down the subtree
        // and the caller's "was this the note I have open?" test is an id
        // comparison — the same reason `archive` above reports its whole set.
        // Reporting only the row that was clicked left the editor open on a
        // descendant that had just been destroyed, autosaving into it.
        //
        // Ahead of the invalidation: deleting the OPEN note navigates away,
        // and a navigation dispatched behind a burst of server actions can be
        // stranded. See the note at the top of this file.
        onRemoved?.(deletedId);
      }
      void invalidateLists();
      toast.success(t('toasts.deleted'));
    },
    onError: (error: Error) => {
      toast.error(t('errors.delete'), { description: error.message });
    },
  });

  return { archive, restore, remove, pin };
}

/**
 * What `useCreateNote` is asked for. Named so `createTargetParentId` below can
 * be checked against it by the compiler rather than by eye.
 */
export interface CreateNoteVariables {
  parentId?: string | null;
  isFolder?: boolean;
  title?: string;
}

/**
 * Every key those variables carry, as a value the guard below can test
 * against.
 *
 * `satisfies Required<CreateNoteVariables>` is the whole point of it existing:
 * renaming, removing or ADDING a field on the interface above fails to
 * type-check here, so the guard cannot silently fall out of step with the
 * shape it is guarding. The values are placeholders; only the keys are read.
 */
const CREATE_NOTE_VARIABLE_TEMPLATE = {
  parentId: null,
  isFolder: false,
  title: '',
} satisfies Required<CreateNoteVariables>;

/**
 * The level a pending create is writing into, read back from the cache — where
 * variables are `unknown`, because it holds every mutation.
 *
 * Three answers, and the third is the fix. `null` is the ROOT, which is what
 * `{}`, an absent `parentId` and the palette's argument-less `mutate()` all
 * mean. A string is that level. `undefined` means "these are not a create's
 * variables at all", and it used to be folded into `null` — correct only for
 * as long as the shape above never changes, because a renamed or re-nested
 * `parentId` would still have answered "the root" rather than "I don't know".
 * The caller draws a pending skeleton row at whatever level comes back, so
 * that reads as a row appearing in the wrong place: a rendering glitch to look
 * at, and nothing to trace it by. `undefined` matches no level, so the
 * skeleton is simply not drawn — the safe direction for a purely cosmetic row.
 */
export function createTargetParentId(
  variables: unknown
): string | null | undefined {
  // `mutate()` with no argument — the palette's "New note". The mutation
  // function's own `= {}` default is what makes that the root.
  if (variables === undefined) return null;
  if (typeof variables !== 'object' || variables === null) return undefined;

  const keys = Object.keys(variables);
  if (!keys.every((key) => key in CREATE_NOTE_VARIABLE_TEMPLATE)) {
    return undefined;
  }

  // No `parentId` key at all is the root: `mutate({})`, and the draft row's
  // `{ isFolder, title }`.
  if (!('parentId' in variables)) return null;

  const { parentId } = variables;
  if (typeof parentId === 'string') return parentId;
  return parentId === undefined || parentId === null ? null : undefined;
}

/**
 * The one create-note mutation, shared by the tree panel's `+` button and the
 * command palette's "New note" action — two implementations of one thing is
 * the bug AGENTS §11.3 names, and this used to live inline in the panel.
 *
 * `searchAll` IS invalidated, unlike in the autosave's `applySaveResult`: the
 * empty-term search (what the palette runs on open) lists every note by
 * `updatedAt desc`, so a brand-new note belongs at the top of it — and, being
 * new, no previously cached search result holds a stale copy to race with.
 */
export function useCreateNote(
  onCreated?: (noteId: string) => void,
  /**
   * Fired for EVERY created row, folders included — unlike `onCreated`, which
   * fires only for notes because it means "open this in the editor" and a
   * folder has no document to open.
   *
   * The tree uses it to make the new row the explorer's selection, so that
   * pressing `n` twice creates two siblings rather than two rows in whatever
   * was selected before.
   */
  onCreatedRow?: (note: { id: string; isFolder: boolean }) => void
) {
  const t = useTranslations('dashboard.note');
  const invalidateLists = useInvalidateNoteLists();

  return useMutation({
    mutationKey: CREATE_NOTE_MUTATION_KEY,
    /**
     * No variables = an untitled root note; pass `parentId` to create
     * inside a folder (or any note), `isFolder` for an Obsidian folder.
     *
     * `title` is optional and defaults to the placeholder, so every existing
     * caller is unaffected (AGENTS §11.6). It exists for the tree's draft row,
     * which asks for the name BEFORE the note exists — the author types it into
     * the row itself and this creates the note already named, instead of
     * creating an "Untitled" one and renaming it a moment later.
     */
    mutationFn: async (variables: CreateNoteVariables = {}) => {
      const res = await createNote({
        title:
          variables.title ??
          (variables.isFolder ? t('untitledFolder') : t('untitled')),
        parentId: variables.parentId ?? null,
        isFolder: variables.isFolder ?? false,
      });
      if (!res.success) throw new Error(res.errorMsg);
      return res.data;
    },
    onSuccess: (note) => {
      onCreatedRow?.(note);
      // Folders have no document to open — they get renamed in place
      // instead of navigating to an editor that means nothing for them.
      //
      // BEFORE the invalidation, and that ordering IS the fix for a
      // create-and-open that created the note and then never opened it. See
      // the note at the top of this file for the router queue this races.
      if (!note.isFolder) onCreated?.(note.id);
      // RETURNED, so the mutation stays pending until the level has re-read —
      // otherwise the tree's pending row goes one round trip before the real
      // one arrives. `invalidateQueries` swallows a failed refetch rather than
      // rejecting, so this cannot turn a created note into a failure toast.
      return invalidateLists();
    },
    onError: (error: Error) => {
      toast.error(t('errors.create'), { description: error.message });
    },
  });
}

/** Renames a note/folder from the tree, without opening the editor. */
export function useRenameNote() {
  const t = useTranslations('dashboard.note');
  const queryClient = useQueryClient();
  const invalidateLists = useInvalidateNoteLists();
  const relabelInboundLinks = useRelabelInboundLinks();

  return useMutation({
    mutationFn: async (input: {
      id: string;
      title: string;
      /**
       * The name the row carried before this edit.
       *
       * Optional so no existing caller breaks, but without it the inbound-link
       * relabel below cannot run: the whole safety of that operation rests on
       * matching anchors whose text is still an exact copy of the OLD title,
       * and nothing on the server remembers what that was a moment ago.
       */
      previousTitle?: string;
    }) => {
      const res = await updateNote({ id: input.id, title: input.title });
      if (!res.success) throw new Error(res.errorMsg);
      return { note: res.data, previousTitle: input.previousTitle };
    },
    onSuccess: ({ note: data, previousTitle }) => {
      queryClient.setQueryData(noteKeys.detail(data.id), data);
      void invalidateLists();

      // Fired and NOT awaited. The rename is done and the tree has already
      // re-read; tidying up other notes' labels happens behind that, and must
      // never be something the author waits on. See the hook for the policy.
      if (previousTitle !== undefined) {
        relabelInboundLinks(data.id, previousTitle, data.title);
      }
    },
    onError: (error: Error) => {
      toast.error(t('errors.save'), { description: error.message });
    },
  });
}
