'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useDebounce } from '@byte-of-me/ui';
import { toEditorContent } from '@byte-of-me/ui/lib/rich-text-content';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import {
  cacheServerNote,
  getAdminNoteById,
  hasNoteBeenDeleted,
  markLocalNoteSynced,
  type NoteDetail,
  noteKeys,
  readLocalNote,
  updateNote,
  type UpdateNoteInput,
  writeLocalNote,
} from '@/entities/note';
import {
  AUTOSAVE_SPEED_MS,
  useWorkspaceSettings,
} from '@/entities/workspace-settings';
import { useDepartureFlush } from '@/shared/hooks/use-departure-flush';

/**
 * One typing pause before a save leaves the browser.
 *
 * Still exported, and still the number every comment in this file reasons
 * about, but no longer the only possible value: the author can pick from
 * `AUTOSAVE_SPEED_MS` in workspace settings, and this is what `normal` maps to.
 * Nothing about the save pipeline depends on the specific figure — the local
 * write-through happens before the debounce either way, so a longer delay costs
 * network round trips, never text.
 */
export const AUTOSAVE_DEBOUNCE_MS = 1000;

type SaveValues = Omit<UpdateNoteInput, 'id'>;
/** What every `save.mutate(...)` call passes — the target id travels WITH
 *  the call, not through the `noteId` closure, specifically so
 *  `onSuccess`/`onError` (which run whenever the request settles, possibly
 *  after `noteId` has since changed) know which note they are for. */
type SaveVariables = { id: string } & SaveValues;

/** What this hook currently believes is the authoritative state for the open
 *  note: the last `title`/`content` it either seeded from or successfully
 *  reconciled with the server, and the server row's `updatedAt` (as
 *  milliseconds) that state corresponds to. */
interface BufferProvenance {
  title: string;
  content: string;
  updatedAt: number;
}

/**
 * Two versions of one note that cannot both be kept: edits this browser never
 * managed to send, and a server row that moved on without them.
 *
 * Only ever raised for a LOCAL copy marked dirty — an ordinary "the server is
 * ahead" is a silent catch-up, not a question, and always was.
 */
export interface NoteEditConflict {
  /** When the other device's version was written. */
  serverUpdatedAt: Date;
  /** When this browser last stored the unsent edits. */
  localSavedAt: Date;
}

export interface UseNoteEditorAutosaveResult {
  note: NoteDetail | undefined;
  isPending: boolean;
  isError: boolean;
  /** False for exactly the one render where `note` first resolves (or
   *  switches to a different note) but the seed effect has not yet applied
   *  it — see `isSeededForCurrentNote`'s own comment inside the hook. The
   *  caller must treat this the same as `isPending`: rendering the rich-text
   *  editor before this is true would mount it from the pre-seed `content`
   *  buffer (`''`, or the PREVIOUS note's body), which — now that the editor
   *  is keyed on `seedGeneration` too, not just `note.id` — briefly becomes a
   *  REAL, recorded mount (not just an inert prop that gets overwritten next
   *  render), because `seedGeneration` bumping one render later changes the
   *  key and forces a second mount right behind it. */
  isSeeded: boolean;
  title: string;
  setTitle: (value: string) => void;
  content: string;
  setContent: (value: string) => void;
  isSaving: boolean;
  isSaveError: boolean;
  /** Bumps every time `content` is (re)seeded — on a note switch, or on the
   *  I2 catch-up below. The rich-text editor is uncontrolled after mount
   *  (see `note-editor.tsx`'s own comment on why), so the only way to make
   *  it show a reseeded document is to force a remount; the caller does that
   *  by folding this into that element's `key` alongside `note.id`. Without
   *  it, `key={note.id}` alone never changes on a same-note reseed, so the
   *  buffer and the visible document silently split — the buffer this hook
   *  reports catches up, but the editor on screen does not, with nothing
   *  indicating the two disagree. */
  seedGeneration: number;
  /**
   * The seeded document, ready to hand straight to the rich-text editor's
   * `value`. Changes on exactly the commits `seedGeneration` does — which are
   * the only commits the editor reads it on — so the caller never has to
   * re-derive it per render. See the state's own comment in the hook.
   */
  seedValue: ReturnType<typeof toEditorContent>;
  /** Resends the current buffer. For the case a failed save leaves nothing
   *  else to trigger a resend — nothing has changed since, so the regular
   *  autosave effect below will not fire again on its own. */
  retry: () => void;
  /**
   * Non-null while unsent local edits and a newer server row are both in
   * play. Autosave is suspended for as long as it is — see the guard in the
   * autosave effect.
   */
  conflict: NoteEditConflict | null;
  /** The author's answer. Takes the banner down either way. */
  resolveConflict: (choice: 'keep-mine' | 'take-server') => void;
}

/**
 * Loads one note and autosaves `title`/`content` back on a debounce.
 *
 * The hard part is entirely about WHICH commit `title`/`content` are
 * trustworthy in, across three transitions that all reuse the same hook
 * instance: `note` resolving for the first time, `noteId` switching to a
 * different note while this stays mounted, and this unmounting mid-edit. See
 * the comment on each ref for the specific failure it closes.
 */
export function useNoteEditorAutosave(
  noteId: string
): UseNoteEditorAutosaveResult {
  const t = useTranslations('dashboard.note');
  const queryClient = useQueryClient();
  const { settings: workspaceSettings } = useWorkspaceSettings();

  const {
    data: note,
    isPending,
    isError,
  } = useQuery({
    queryKey: noteKeys.detail(noteId),
    queryFn: async () => {
      const res = await getAdminNoteById(noteId);
      if (!res.success) throw new Error(res.errorMsg);
      // Keep the browser's copy current so the NEXT open of this note paints
      // from disk. `cacheServerNote`, not `writeLocalNote`: it declines when
      // the stored copy still holds unsent edits, which are by definition
      // newer than anything a read can return.
      void cacheServerNote(noteId, res.data);
      return res.data;
    },
  });

  /**
   * Paints from the browser's own copy while the read above is still in
   * flight — the local-first half of this editor.
   *
   * `(protected)/layout.tsx` is `force-dynamic` and `getAdminNoteById` pays an
   * auth check plus a query on every call, which `use-note-prefetch.ts`
   * measured at roughly a second on the first open of any note. IndexedDB
   * answers in single-digit milliseconds, so seeding the query cache from it
   * lets the document appear immediately and the network settle underneath.
   *
   * Guarded on the cache being EMPTY: a hover prefetch or an earlier visit may
   * already have put the server's row there, and that row is at least as fresh
   * as this one. Nothing is overwritten, so this can only ever turn a
   * skeleton into text sooner.
   *
   * Local edits are safe from the read that follows. The seed effect below
   * records `lastSentRef.updatedAt` from whatever it seeded — the local copy's
   * base — and the I2 catch-up only reseeds when the server's row is STRICTLY
   * newer than that. A server row at the same `updatedAt` (the ordinary case,
   * the local copy being an unsent edit ON TOP of it) therefore changes
   * nothing on screen. A server row that IS newer means another device wrote
   * this note, which is a conflict rather than a catch-up; detecting it needs
   * `LocalNote.dirty` and a decision from the author, and is not yet wired.
   */
  /**
   * The server row this buffer's UNSENT edits were made on top of, when the
   * buffer came from a local copy that had some.
   *
   * `null` in the ordinary case — nothing unsent, so nothing to conflict.
   * Non-null it is the common ancestor: if the server's row turns out to be
   * newer than this, another device has written the note since these edits
   * were made, and the two versions cannot both be right.
   *
   * State, not a ref, because both writes have to reach the screen: the read
   * below resolves asynchronously and must be able to raise the banner, and
   * resolving the conflict must be able to take it down.
   */
  const [conflictBase, setConflictBase] = useState<{
    /** `updatedAt` of the server row those unsent edits were made on top of. */
    base: number;
    /** When this browser stored them, for the banner to name. */
    savedAt: number;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    // A different note means the previous note's unsent-edit provenance is
    // meaningless here. Cleared before the read below can resolve, so a stale
    // base can never be compared against a new note's row.
    setConflictBase(null);

    void readLocalNote(noteId).then((local) => {
      if (cancelled || !local) return;
      // Recorded even when the cache already holds a server row: the question
      // "were there unsent edits, and what were they based on" is about the
      // stored copy, not about who won the race to fill the cache.
      if (local.dirty) {
        setConflictBase({ base: local.baseUpdatedAt, savedAt: local.savedAt });
      }
      if (queryClient.getQueryData(noteKeys.detail(noteId))) return;
      queryClient.setQueryData(noteKeys.detail(noteId), local.detail);
    });

    return () => {
      cancelled = true;
    };
  }, [noteId, queryClient]);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  // See `UseNoteEditorAutosaveResult.seedGeneration`'s own doc comment for
  // why this exists at all. Bumped in the seed effect below, always on a
  // note switch and, for a same-note reseed, only when `content`
  // specifically is about to change — a title-only correction (the common
  // case: the server trimming what was sent, see the `save.mutate` comment
  // near the bottom) has no DOM to resync, since the title is a plain
  // controlled `<input>`, and forcing a remount for it would reset the rich
  // text editor's undo history for no reason.
  const [seedGeneration, setSeedGeneration] = useState(0);
  /**
   * The seeded document, already parsed into the shape the rich-text editor
   * wants — produced exactly once per seed, in the same effect call that sets
   * `content`.
   *
   * `note-editor.tsx` used to compute this inline as `toEditorContent(content)`
   * on every render, which meant a `JSON.parse` of the WHOLE document on every
   * keystroke, for a prop the editor reads only when it mounts (see that
   * component's own comment on the `key`). Measured on a realistic Tiptap
   * document: 0.07ms at 21KB, 0.27ms at 83KB, 1.08ms at 334KB — and the more
   * expensive half of the `fromEditorContent`/`toEditorContent` round trip.
   *
   * Carried as state rather than a `useMemo` over `content`, so it changes on
   * exactly the commits `seedGeneration` does with no dependency array that
   * lints one way and behaves another. The SERIALIZING half stays where it
   * is: measured at 0.04–0.46ms, it did not justify reworking the guards
   * below, and this hook's history is a list of regressions that came from
   * doing exactly that.
   *
   * `ReturnType<typeof toEditorContent>` rather than tiptap's `Content`: that
   * type lives in `@tiptap/core`, which this app does not depend on directly.
   */
  const [seedValue, setSeedValue] =
    useState<ReturnType<typeof toEditorContent>>('');

  // Which note `title`/`content` currently belong to (`seededNoteId`), and
  // what this hook currently treats as the authoritative state for that note
  // (`lastSentRef` — title/content/updatedAt). Both are refs rather than
  // state: they gate effects and must be readable synchronously inside them,
  // including inside cleanup functions that run before a re-render would
  // otherwise let a state read reflect it.
  //
  // `seededNoteId` guards the seed effect below on the note's ID, not on
  // `note` object identity, because `note` gets a new object reference on
  // every refetch of the SAME note too — window focus, and the refetch
  // `applySaveResult` triggers after a save. Reseeding whenever `note`
  // merely changes reference would blow away in-progress keystrokes with
  // whatever the server last returned; the same shape of bug
  // `blog-form.tsx`'s `seededBlogId` ref guards against.
  //
  // That id-only guard has a second job, though, once a save can land AFTER
  // the author has switched away and back: it is also why a note revisited
  // while an earlier save for it is still in flight does not just freeze on
  // stale text forever. Switching notes and back resets `seededNoteId` to a
  // DIFFERENT value in between, so returning always re-seeds from whatever
  // the cache holds AT THAT MOMENT (possibly still the pre-save row, if the
  // save has not landed yet) — id-only. To let a later-arriving response
  // still reach the buffer once it lands, the seed effect below also
  // re-seeds — while STAYING ON THE SAME note, id unchanged — whenever
  // `note.updatedAt` has advanced past the timestamp recorded here, but
  // *only* when the buffer has not diverged from what was last recorded
  // (i.e. nothing has been typed since). That second condition is what keeps
  // this from becoming the exact bug the id-guard exists to prevent, reached
  // through a different door: "catch up to newer server data" must never be
  // allowed to mean "overwrite text the author is mid-typing that the
  // debounce simply has not sent yet."
  const seededNoteId = useRef<string | null>(null);
  const lastSentRef = useRef<BufferProvenance | null>(null);

  // Updated unconditionally every render (not just on renders an effect
  // happens to run on), so the departure effect further down — whose closure
  // would otherwise be frozen at whatever render last changed `noteId` — can
  // always read the actual latest keystroke instead of a stale one.
  //
  // Carries WHICH NOTE those values are text for, and that is
  // `seededNoteId.current` — not `noteId`. The two differ in both directions
  // and each difference matters:
  //
  //   - On the render `noteId` switches in, `title`/`content` still hold the
  //     DEPARTING note's text (the seed effect has not run yet), and
  //     `seededNoteId.current` still names that departing note — which is
  //     exactly the note the flush below is about to send them under.
  //     Tagging with `noteId` would mislabel them as the new note's and
  //     silently drop a pending edit on every switch.
  //   - On a MOUNT render, `title`/`content` are `''`/`''` and
  //     `seededNoteId.current` is still null, so they are labelled as
  //     belonging to no note at all — which is the point. The seed effect
  //     writes `lastSentRef` DURING that same commit's effects, while these
  //     state values do not reach a render until the next one, so anything
  //     comparing the two in between weighs a seeded provenance against a
  //     pre-seed buffer and sees an edit nobody made. React does exactly
  //     that in development: `reactStrictMode` (next.config.js) runs a fresh
  //     mount's effects setup → cleanup → setup, so the departure cleanup
  //     below ran between the seed effect writing `lastSentRef` and the
  //     seeded text ever being rendered. With a warm query cache — any note
  //     opened a second time in a session, which is also when `note` is
  //     available on the very first render — that flushed a blank
  //     `updateNote` on EVERY open: rejected by `updateNoteSchema`'s
  //     `title` minimum with a red toast, and, because a flush records what
  //     it sent, leaving `lastSentRef` claiming blank was sent, so the
  //     autosave effect wrote the whole untouched note back over itself one
  //     debounce later. Found by manual smoke testing, not by this hook's
  //     tests, which never mounted it under StrictMode.
  const latestBufferRef = useRef<{
    noteId: string | null;
    title: string;
    content: string;
  }>({ noteId: null, title, content });
  latestBufferRef.current = { noteId: seededNoteId.current, title, content };

  // Read at render time, so it reflects the END of the PREVIOUS commit's
  // effects — i.e. it is false for exactly the one render where `noteId` (or
  // the freshly loaded `note`) has changed but the seed effect below has not
  // yet applied it. The autosave effect needs that: `title`/`content` still
  // hold the PREVIOUS note's text in that render (the seed effect's
  // `setTitle`/`setContent` only take effect starting next render), so
  // without this gate the autosave effect would compare stale text against
  // the new note and save one note's body over another's id. Reading the ref
  // INSIDE the autosave effect instead would not work: effects run in
  // declaration order within a commit, so by the time the autosave effect's
  // body runs, the seed effect declared above it has already flipped the ref
  // for the new note, and the guard would wrongly pass.
  const isSeededForCurrentNote = seededNoteId.current === noteId;

  // Also computed at render time, and for the same reason
  // `isSeededForCurrentNote` is: it has to see `lastSentRef` as it stood
  // BEFORE this commit's effects run, not after. The seed effect below can,
  // in the same commit, reseed `title`/`content` from a `note` that just
  // arrived with a newer `updatedAt` (the I2 fix two effects down) — when it
  // does, it updates `lastSentRef` synchronously, a ref write, but
  // `title`/`debouncedTitle` do not reflect the reseed until the NEXT
  // render. The autosave effect further below runs in this SAME commit too
  // (`note` changing is in both effects' deps), and without this flag it
  // would read the STALE, pre-reseed `title`/`debouncedTitle` — which still
  // trivially equal each other, since neither has changed yet — against the
  // JUST-reseeded `lastSentRef`, see a mismatch that has nothing to do with
  // an actual edit, and resend the stale pre-reseed buffer. That reproduces
  // C2's loop through a path C2's own guard cannot see on its own, because
  // both refs it compares are consistent with EACH OTHER — just not with
  // the render this commit is about to produce. Confirmed by reproducing it
  // before adding this flag: a trimmed title kept resending indefinitely,
  // each cycle bumping `note.updatedAt` and looking newer than the last.
  /**
   * Another device wrote this note while this browser was holding edits it
   * never managed to send.
   *
   * The catch-up below cannot tell this apart from its own case on its own,
   * and that is the point of `conflictBaseRef`. Both look identical from
   * inside the hook: the server's row is newer than what the buffer was built
   * from, and the buffer equals what was last "sent". The difference is
   * whether those edits ever reached the server at all — and only the local
   * store knows, because only it survives the reload that lost them.
   *
   * Reseeding here would be a silent data loss: the author's unsent
   * paragraph replaced by a version that never contained it, with nothing on
   * screen to say so. `use-form-autosave.ts` already states the house
   * position on exactly this — restoring is the author's decision, never
   * automatic, because the snapshot may be older than what the server has.
   * Here neither side is safely older, which is why it is a question rather
   * than a rule.
   */
  const hasConflict = Boolean(
    note &&
      seededNoteId.current === noteId &&
      conflictBase !== null &&
      note.updatedAt.getTime() > conflictBase.base
  );

  /** The banner's data, or `null` when there is nothing to ask about. */
  const conflict: NoteEditConflict | null =
    hasConflict && note && conflictBase
      ? {
          serverUpdatedAt: note.updatedAt,
          localSavedAt: new Date(conflictBase.savedAt),
        }
      : null;

  const willReseedThisCommit = Boolean(
    note &&
      seededNoteId.current === noteId &&
      lastSentRef.current &&
      note.updatedAt.getTime() > lastSentRef.current.updatedAt &&
      title === lastSentRef.current.title &&
      content === lastSentRef.current.content &&
      // Hold the buffer where it is until the author has chosen. Everything
      // else about this commit stays true; what changes is that the newer
      // server row is no longer automatically the right answer.
      !hasConflict
  );

  // DELIBERATE, not incidental: this condition is satisfied after EVERY
  // successful save that lands while the same note is still open, not only
  // the switch-away-and-back case above — `onMutate` records the PRE-save
  // `updatedAt`, `onSuccess` writes a row with a newer one, and (with
  // nothing typed meanwhile) the buffer still equals what was just sent. The
  // visible effect: type a title with a trailing space, and about a second
  // after the save round-trips, the input visibly settles to
  // `updateNoteSchema`'s trimmed version — the server's canonical form
  // replacing what was typed, unprompted.
  //
  // Kept, not suppressed. A "only reseed when the difference is not just my
  // own normalisation" version would need either the client re-deriving
  // exactly what `updateNoteSchema`'s `.trim()` (and anything it grows
  // later) does — a duplicate of server-side validation logic this codebase
  // otherwise keeps server-only on purpose — or `onSuccess` reconciling
  // `lastSentRef` for its own note directly instead of leaving it to this
  // same general check, which was tried and rejected: it has to skip doing
  // that the moment `variables.id !== noteId` (the author has switched
  // away), and at that point nothing updates the DISPLAYED buffer for a
  // later return visit either — reintroducing I2 for exactly the case this
  // mechanism exists to fix. Once catching up to newer server data has to
  // stay general enough to cover "an earlier save lands after a switch back"
  // (I2's actual bug), it cannot also special-case "unless the newer data is
  // just my own echo" without either duplicating server logic or carving
  // out the one case (still-open, own save) that is safe to special-case
  // while leaving the one that matters (switched away) exactly as general as
  // before — which is not a simplification, just the same mechanism with
  // extra bookkeeping bolted on. The remaining cost is bounded by the
  // `seedGeneration` change just above: a title-only correction like this
  // no longer forces the rich-text editor to remount (no undo history lost)
  // — only a genuine content catch-up does, which real normalisation of
  // `content` cannot even trigger today (`updateNoteSchema` has no transform
  // on it), so in practice this path only touches the title.

  useEffect(() => {
    if (!note) return;
    const noteUpdatedAt = note.updatedAt.getTime();

    if (seededNoteId.current !== noteId) {
      // A genuinely different note: the previous buffer belongs to a note
      // that has nothing to do with this one, so it is always overwritten.
      // Whatever pending edit the OLD note's buffer held was already handed
      // to the departure effect further down before this can run — all
      // sibling effects' cleanups in a commit run before any of their
      // setups, so that effect's cleanup for the note being LEFT always
      // reads `lastSentRef` before this write below replaces it.
      seededNoteId.current = noteId;
      setTitle(note.title);
      setContent(note.content);
      // Parsed here, beside the buffer it belongs to, so the two can never
      // describe different documents — see `seedValue`'s own comment.
      setSeedValue(toEditorContent(note.content));
      setSeedGeneration((generation) => generation + 1);
      lastSentRef.current = {
        title: note.title,
        content: note.content,
        updatedAt: noteUpdatedAt,
      };
      return;
    }

    // Same note, but the query cache now holds something NEWER than what
    // this buffer was last built from — a save that was still in flight
    // when the author switched away has since landed, most commonly. Catch
    // up, but only when the buffer has not diverged from `lastSentRef` (see
    // the long comment above `seededNoteId`): if it HAS diverged, there is
    // an edit sitting in `title`/`content` that is newer than the server
    // row by definition — the debounce has simply not sent it yet — and
    // overwriting it here would silently roll it back. This is exactly
    // `willReseedThisCommit`, computed above at render time.
    if (willReseedThisCommit) {
      setTitle(note.title);
      setContent(note.content);
      // Only the CONTENT reseed needs a fresh `seedGeneration` — see the
      // state's own doc comment. Comparing against `content` (this render's
      // buffer, which `willReseedThisCommit` has already established equals
      // `lastSentRef.current.content`) rather than `lastSentRef` again is
      // the same check, just already in scope.
      if (note.content !== content) {
        setSeedValue(toEditorContent(note.content));
        setSeedGeneration((generation) => generation + 1);
      }
      lastSentRef.current = {
        title: note.title,
        content: note.content,
        updatedAt: noteUpdatedAt,
      };
    }
  }, [note, noteId, title, content, willReseedThisCommit]);

  // Read from settings rather than taken as a prop: three components sit
  // between the provider and this hook, and none of them has any other reason
  // to know about autosave. `useWorkspaceSettings` falls back to the defaults
  // outside a provider, so every existing spec that renders the editor bare
  // keeps the 1000ms it was written against.
  //
  // `useDebounce` lists `wait` in its effect deps, so changing the setting
  // re-arms the pending timer instead of waiting for a remount.
  const autosaveDelayMs = AUTOSAVE_SPEED_MS[workspaceSettings.autosaveSpeed];

  const [debouncedTitle, , titleDebounce] = useDebounce(title, autosaveDelayMs);
  const [debouncedContent, , contentDebounce] = useDebounce(
    content,
    autosaveDelayMs
  );

  // `useDebounce` returns a brand new `{ cancel, flush }` object every
  // render, so it cannot be listed in a dependency array without an effect
  // re-running (tearing down and re-arming) on every keystroke. Refs give
  // the departure effect below a stable way to reach the CURRENT flush
  // function without that churn.
  const titleDebounceRef = useRef(titleDebounce);
  titleDebounceRef.current = titleDebounce;
  const contentDebounceRef = useRef(contentDebounce);
  contentDebounceRef.current = contentDebounce;

  // Same reasoning as `use-url-synced-search.ts`'s `onCommitRef`: read only
  // inside an effect that deliberately does not re-run on every render, so
  // it must not close over whatever `t` instance happened to exist when that
  // effect was declared.
  const tRef = useRef(t);
  tRef.current = t;

  /**
   * Reconciles the cache with a save that landed.
   *
   * `changed` is what this particular save actually altered, measured against
   * what was last successfully communicated (`lastSentRef` before the send) —
   * NOT against the server's echo, for the reason the autosave effect gives
   * further down. It exists because invalidation here is not free: TanStack
   * refetches every ACTIVE query a key matches, and on `/space/notes/<id>`
   * that is the root level, one query per expanded folder, and the
   * breadcrumb's ancestor chain. Firing all of them on every pause in typing
   * cost three to five extra server actions per second of writing, each
   * paying its own `requireAdmin()` and Prisma round trip — for a tree whose
   * shape a save never changes. Now a content-only save touches no list key
   * at all, and a title-only save touches only the row-label family.
   */
  /**
   * Stores the buffer in the browser's own copy of the note, and marks it as
   * carrying edits the server has not seen.
   *
   * Called immediately BEFORE every network attempt, never after, because
   * this is the write that cannot be cut off. A server action is an ordinary
   * `fetch`, so a save started as the tab closes is best-effort; an IndexedDB
   * put on the same event is local and lands. That ordering is what turns
   * "up to one debounce of typing is lost on a tab close" into "it is on disk
   * and still queued".
   *
   * `note` supplies the fields the buffer does not carry, so the stored
   * record is a complete `NoteDetail` — see `LocalNote.detail`.
   */
  const storeLocally = useCallback(
    (id: string, buffer: { title: string; content: string }) => {
      const base = queryClient.getQueryData<NoteDetail>(noteKeys.detail(id));
      if (!base) return;
      void writeLocalNote({
        id,
        detail: { ...base, title: buffer.title, content: buffer.content },
        baseUpdatedAt: base.updatedAt.getTime(),
        dirty: true,
        savedAt: Date.now(),
      });
    },
    [queryClient]
  );

  const applySaveResult = useCallback(
    (
      id: string,
      data: NoteDetail,
      changed: { title: boolean; content: boolean }
    ) => {
      // Writing the server's response into the detail key directly — rather
      // than invalidating it — is load-bearing, and predates the narrowing
      // above. Invalidating `noteKeys.all` (as an earlier version did)
      // prefix-matches detail AND search, so every autosave re-fetched the
      // very document it had just written. Combined with `updateNoteSchema`'s
      // `.trim()` on title, a trailing space made that re-fetch come back with
      // a DIFFERENT string than what was sent — which, when the "should I
      // save" check compared against the server's copy, looked exactly like a
      // fresh unsaved edit and saved again, forever. See `lastSentRef` above
      // for the other half of the fix.
      queryClient.setQueryData(noteKeys.detail(id), data);

      // The browser's copy is now based on the row the server just wrote, and
      // is clean unless the author typed again while this was in flight —
      // `markLocalNoteSynced` decides that inside one transaction, against
      // what is actually stored, rather than trusting this callback's view.
      void markLocalNoteSynced(id, {
        title: data.title,
        content: data.content,
        updatedAt: data.updatedAt.getTime(),
      });

      // A row's label moved, so the views that draw rows have to re-read.
      // `listLabels()`, not `lists()`: see that factory for which keys it
      // leaves out and why each is safe. Every list-shaped key it DOES name,
      // not just the tree — the explorer reads per-level `children` keys,
      // which a `tree` key does not prefix-match.
      if (changed.title) {
        for (const queryKey of noteKeys.listLabels()) {
          void queryClient.invalidateQueries({ queryKey });
        }
      }

      // Links are rebuilt from the document, so only a content save can move
      // them. Whole prefix rather than this note's key — adding a link changes
      // the TARGET's backlinks, and which note that is cannot be read off the
      // save.
      //
      // Safe in a way the `noteKeys.all` invalidation rejected above is not:
      // `links` feeds nothing the save decision reads, so refetching it cannot
      // loop back into another save. The graph draws those same links and is
      // safe for the same reason. `detail` and `search` are what must stay
      // untouched here.
      if (changed.content) {
        void queryClient.invalidateQueries({ queryKey: noteKeys.linksAll() });
        void queryClient.invalidateQueries({ queryKey: noteKeys.graph() });
      }
    },
    [queryClient]
  );

  const save = useMutation({
    mutationFn: async (variables: SaveVariables) => {
      const { id, ...values } = variables;
      const res = await updateNote({ id, ...values });
      if (!res.success) throw new Error(res.errorMsg);
      return res.data;
    },
    // Records what is ABOUT to be sent before the request leaves, so a
    // second identical debounce firing while this one is still in flight
    // does not send a duplicate (the C2 loop guard). Runs for every
    // `mutate()` call — the interactive autosave effect below and `retry`
    // both go through this, so neither writes `lastSentRef` itself anymore.
    // Snapshots the PREVIOUS value as context so `onError` can put it back:
    // without that, a failed send permanently (and wrongly) claims its
    // content was already communicated, which silently disarms both the
    // next autosave and the departure effect's flush-on-switch/unmount
    // guard — both compare against this same ref.
    onMutate: (variables) => {
      const previous = lastSentRef.current;
      lastSentRef.current = {
        title: variables.title ?? '',
        content: variables.content ?? '',
        updatedAt: note?.updatedAt.getTime() ?? previous?.updatedAt ?? 0,
      };
      return { previous };
    },
    // `variables` is this SPECIFIC call's own — TanStack binds a mutation's
    // `onSuccess`/`onError` to the variables it was invoked with, not to
    // whatever `noteId` the surrounding closure has drifted to by the time
    // the request resolves. Using `variables.id` here (not the `noteId`
    // parameter) is what stops a save that resolves after the author has
    // switched notes from writing the OLD note's row into the NEW note's
    // cache entry — which used to be silently possible because narrowing
    // `applySaveResult`'s invalidation (see its own comment) meant this
    // write goes straight into a specific cache key instead of triggering a
    // broad refetch that would have happened to land on the right key by
    // querying the URL/args again.
    // `context.previous` is `lastSentRef` as it stood BEFORE `onMutate`
    // overwrote it — i.e. the last state this hook knows the server agreed
    // with. Diffing THAT against what was sent is what tells the cache which
    // half of the note actually moved. `previous` is null only on a save that
    // precedes any seed, which cannot happen (the autosave effect gates on
    // `isSeededForCurrentNote`); treating that as "both changed" keeps the
    // conservative behaviour anyway.
    onSuccess: (data, variables, context) =>
      applySaveResult(variables.id, data, {
        title: context?.previous?.title !== variables.title,
        content: context?.previous?.content !== variables.content,
      }),
    onError: (error: Error, _variables, context) => {
      if (context) {
        lastSentRef.current = context.previous;
      }
      toast.error(t('errors.save'), { description: error.message });
    },
  });

  /**
   * The save, as a plain stable function.
   *
   * `mutate` is referentially stable in TanStack Query v5, and its
   * `mutationFn` closure is refreshed from the latest render — via the
   * mutation observer's own internal effect, which runs before the effects
   * below — so `noteId` inside it is never stale even though `mutate` itself
   * never changes identity.
   *
   * Destructured HERE rather than written as `save.mutate` in each dependency
   * array, which is what the two effects below used to do. That form is
   * correct but `react-hooks/exhaustive-deps` cannot see it: the rule works on
   * whole objects, so it asked for `save` — and depending on `save` would
   * re-fire on every pending/success/error transition and turn one edit into a
   * save loop. The warning was previously documented as expected and accepted,
   * with an explicit instruction not to reach for `eslint-disable`. This is the
   * third option: a dependency that is both honest AND machine-checkable, so
   * the arrays below are now verified rather than merely argued for.
   */
  const { mutate: saveNote } = save;

  useEffect(() => {
    if (!note || !isSeededForCurrentNote) return;

    // Nothing leaves this browser while the author has an unanswered question
    // on screen. Without this the debounce would resolve the conflict by
    // itself, in favour of the local buffer, roughly a second after the
    // banner appeared — overwriting the other device's version before it had
    // been read, which is the mirror image of the loss the banner exists to
    // prevent.
    if (hasConflict) return;

    // Deferred to the render the seed effect above's reseed actually lands
    // on — see `willReseedThisCommit`'s own comment for the exact loop this
    // closes. `debouncedTitle`/`title` are both still the PRE-reseed values
    // in this commit, and comparing them against `lastSentRef` (already
    // updated by the reseed, a ref write, ahead of this effect) would look
    // like an edit that needs sending when nothing was actually typed.
    if (willReseedThisCommit) return;

    // The debounce hooks lag `title`/`content` by up to
    // `AUTOSAVE_DEBOUNCE_MS`: right after the seed effect above applies (or
    // right after any keystroke), `debouncedTitle`/`debouncedContent` still
    // hold the OLD value for one or more renders. Firing before they catch
    // up to the CURRENT buffer is what would send a stale — right after a
    // note opens, blank — value.
    if (debouncedTitle !== title || debouncedContent !== content) return;

    // Compared against what was last SENT (`lastSentRef`), never against
    // `note.title`/`note.content` — the server's copy. `updateNoteSchema`
    // trims the title, so the server's echo can legitimately differ from
    // what was sent even when nothing is wrong; comparing against it would
    // mean a trailing space never stops looking like an unsaved edit and
    // resends on every refetch, forever. Comparing against "did WE already
    // send exactly this" instead means the stop condition cannot be
    // defeated by any normalisation the server does now or ever does later
    // — it does not depend on the server echoing back what was sent.
    const sent = lastSentRef.current;
    if (
      sent &&
      debouncedTitle === sent.title &&
      debouncedContent === sent.content
    ) {
      return;
    }

    // The browser's own copy, written before the request goes out — see
    // `storeLocally`. If the save fails or never lands, this is what still
    // holds the edit, and what `listDirtyLocalNotes` will offer back.
    storeLocally(noteId, {
      title: debouncedTitle,
      content: debouncedContent,
    });

    // `saveNote`, not `save.mutate`: same function, but as a dependency the
    // linter can actually check. See its declaration for why depending on the
    // whole `save` object would turn one edit into a save loop.
    saveNote({ id: noteId, title: debouncedTitle, content: debouncedContent });
  }, [
    note,
    isSeededForCurrentNote,
    willReseedThisCommit,
    debouncedTitle,
    debouncedContent,
    title,
    content,
    noteId,
    saveNote,
    // `useCallback`-stable on `queryClient`, so it never re-arms this effect.
    storeLocally,
    hasConflict,
  ]);

  /**
   * Sends whatever is sitting in the buffer for `departingId` right now,
   * bypassing the debounce entirely.
   *
   * A named function rather than the body of the departure effect below,
   * because the page being HIDDEN needs the identical treatment and two
   * copies of this reconciliation is exactly the duplication that lets one
   * of them drift. It reads `latestBufferRef`/`lastSentRef` — refs, always
   * current — rather than values closed over at declaration time, which
   * would be stale by the time it actually runs.
   *
   * Deliberately NOT routed through `save.mutate`: the mutation observer
   * belongs to a component that may be unmounting as this runs, and
   * `onSuccess`/`onError` on a dead observer never fire.
   */
  const flushPending = useCallback(
    (departingId: string) => {
      // Deleting the open note unmounts this editor, which is the SAME
      // departure as closing the pane — and the two need opposite answers.
      // Without this the delete was followed a beat later by a red "Failed to
      // save" for the row it had just removed: a real `updateNote` against an
      // id the server no longer has, and an IndexedDB record rewritten for it
      // on the way past. First, before the debounce settle below, because
      // there is no longer anything to send to; the debounce's own timer is
      // cleared by its hook's unmount cleanup either way.
      //
      // This is a suppression of a save that CANNOT succeed, not of failure
      // reporting: every other `updateNote` here still reports its own error
      // loudly, and this branch is only reachable after a delete this browser
      // itself performed.
      if (hasNoteBeenDeleted(queryClient, departingId)) return;

      // Settles `useDebounce`'s own internal pending timer so it does not
      // fire later against whatever the NEXT note's buffers happen to hold.
      // The save below does not depend on this — it reads the buffer
      // directly — this only prevents a harmless-but-wasteful dangling
      // timeout inside the debounce hook itself.
      titleDebounceRef.current.flush();
      contentDebounceRef.current.flush();

      const pending = latestBufferRef.current;
      const sent = lastSentRef.current;
      if (!sent) return;
      // Only the departing note's OWN text may be flushed under its id. Any
      // other provenance means there is nothing here that was typed for it:
      // `null` is a buffer that no render has seeded yet (see
      // `latestBufferRef`), and a different id cannot happen from a switch
      // (the buffer is tagged with the note it holds, and that IS the
      // departing one at that moment) — both are "nothing to save", never
      // "save this under that id".
      if (pending.noteId !== departingId) return;
      if (pending.title === sent.title && pending.content === sent.content) {
        return;
      }

      // Captured before `lastSentRef` is overwritten below — same diff the
      // mutation's `onSuccess` takes from `context.previous`, for the same
      // reason: it decides which cache families this save has to disturb.
      const changed = {
        title: pending.title !== sent.title,
        content: pending.content !== sent.content,
      };

      lastSentRef.current = {
        title: pending.title,
        content: pending.content,
        updatedAt: sent.updatedAt,
      };
      // Local first, and on this path that ordering is the whole point: this
      // runs on `visibilitychange`/`pagehide`, where the request below may
      // never leave.
      storeLocally(departingId, pending);
      void updateNote({
        id: departingId,
        title: pending.title,
        content: pending.content,
      }).then((res) => {
        if (res.success) {
          applySaveResult(departingId, res.data, changed);
        } else {
          toast.error(tRef.current('errors.save'), {
            description: res.errorMsg,
          });
        }
      });
    },
    // `applySaveResult` and `storeLocally` are both `useCallback`-stable on
    // `queryClient`, which does not change identity in this app, so this
    // settles once — not on every render, which is what would happen if it
    // depended on `t` (a new bound function most renders) directly instead of
    // through `tRef`. `queryClient` is the same stable value those two close
    // over, so naming it here adds a dependency the linter can check without
    // re-arming anything.
    [applySaveResult, storeLocally, queryClient]
  );

  // Persists a pending, not-yet-debounced edit at every moment no LATER
  // render exists in which the autosave effect above could ever catch it:
  // switching to a different note (this hook instance survives that; the
  // effect above is about to start comparing against a NEW note's id, and
  // would otherwise just discard whatever was still pending for the old
  // one), unmounting outright, and the page going away without React
  // unmounting anything at all — a reload, a tab close, a phone OS
  // discarding a backgrounded tab. Before that last group was covered, up to
  // `AUTOSAVE_DEBOUNCE_MS` of typing was silently lost with the status line
  // still reading "Saved".
  //
  // `updateNote` is a server action, i.e. an ordinary `fetch` that cannot
  // carry `keepalive`, so a request started on `pagehide` is best-effort —
  // the browser may still cut it off. `storeLocally` inside `flushPending`
  // is what makes that survivable: an IndexedDB put on the same event lands,
  // and `use-note-sync-queue` sends it on the next visit.
  useDepartureFlush(noteId, flushPending);

  /**
   * The author's answer to the conflict banner.
   *
   * `keep-mine` SENDS the buffer, rather than merely re-arming the autosave
   * and hoping. Nothing about the buffer changed when the author clicked, so
   * the ordinary "is there anything new to send" check would find the buffer
   * equal to what was last recorded and do nothing at all — the edit would
   * sit on screen looking saved, forever. Going through `saveNote` also
   * rebases correctly for free: `onMutate` records what it sends against
   * `note.updatedAt`, which is the server row this now deliberately replaces.
   *
   * `take-server` reseeds from the server row and bumps `seedGeneration`, so
   * the visible document is remounted onto it — the same mechanism a
   * post-save catch-up uses. The local copy is overwritten and marked clean,
   * with `writeLocalNote` rather than `cacheServerNote` because the stored
   * record is dirty and `cacheServerNote` would (correctly, in every other
   * situation) refuse to touch it.
   *
   * Either way `conflictBase` goes back to null, which takes the banner down
   * and re-arms the autosave.
   */
  const resolveConflict = useCallback(
    (choice: 'keep-mine' | 'take-server') => {
      if (!note) return;
      const serverUpdatedAt = note.updatedAt.getTime();

      if (choice === 'take-server') {
        setTitle(note.title);
        setContent(note.content);
        setSeedValue(toEditorContent(note.content));
        setSeedGeneration((generation) => generation + 1);
        lastSentRef.current = {
          title: note.title,
          content: note.content,
          updatedAt: serverUpdatedAt,
        };
        void writeLocalNote({
          id: noteId,
          detail: note,
          baseUpdatedAt: serverUpdatedAt,
          dirty: false,
          savedAt: Date.now(),
        });
      } else {
        // `title`/`content` are deliberately untouched — the whole point of
        // this branch is that what is on screen wins. Stored locally first,
        // the same ordering every other send uses.
        storeLocally(noteId, { title, content });
        saveNote({ id: noteId, title, content });
      }

      setConflictBase(null);
    },
    [note, noteId, title, content, saveNote, storeLocally]
  );

  const retry = useCallback(() => {
    if (!note) return;
    saveNote({ id: noteId, title, content });
  }, [note, noteId, title, content, saveNote]);

  // Scoped to the CURRENTLY OPEN note: `save` (the mutation observer) is one
  // instance shared across every note this hook instance ever opens, so its
  // `isPending`/`isError` alone would stay true for note B after a failure
  // on note A, purely because nothing resets them on a `noteId` change. That
  // showed a "Not saved" status — and a `retry` that would have silently
  // written B's own, perfectly fine buffer over B, telling the author their
  // lost edit on A had been recovered when nothing about A had changed.
  // `save.variables` is the variables of the MOST RECENT `mutate()` call
  // (TanStack tracks this per mutation, same mechanism `onSuccess`/`onError`
  // above rely on), so comparing its `id` against the currently open note is
  // enough to tell "is this status about the note on screen right now."
  const isSavingCurrentNote = save.isPending && save.variables?.id === noteId;
  const isSaveErrorForCurrentNote =
    save.isError && save.variables?.id === noteId;

  return {
    note,
    isPending,
    isError,
    isSeeded: isSeededForCurrentNote,
    title,
    setTitle,
    content,
    setContent,
    seedGeneration,
    seedValue,
    isSaving: isSavingCurrentNote,
    isSaveError: isSaveErrorForCurrentNote,
    retry,
    conflict,
    resolveConflict,
  };
}
