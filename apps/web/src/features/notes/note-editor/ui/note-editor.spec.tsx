/**
 * `apps/web`'s first component spec. It exists specifically to catch the
 * class of bug a hand-trace of React's effect timing can miss: C1–C3 in this
 * feature's code review were all "the autosave fires (or doesn't fire, or
 * doesn't recover) at exactly the wrong render", and two of the three were
 * only caught by an actual React runtime, not by reasoning about it. See
 * `use-note-editor-autosave.ts` for what each assertion here defends.
 *
 * Keyed vs. unkeyed: every test in the main `describe` block below renders
 * through `Harness` with `keyed: false` (its default) — a `noteId` switch
 * REUSES the same `<NoteEditor>`/hook instance, exactly like this suite
 * always has. Production (`widgets/notes/note-manager/ui/note-manager.tsx`)
 * does not: it renders `<NoteEditor key={activeId} noteId={activeId} />`, so
 * a note switch there unmounts the old instance and mounts a fresh one. That
 * was traced for defects during review and none were found — the departure
 * flush still fires on unmount (before any new passive mount, same as
 * React's normal cleanup-before-setup ordering), `applySaveResult` still
 * writes into the correct cache key by id, and a save that lands after
 * returning to a note still reaches the buffer, just through a fresh
 * instance's seed effect finding `willReseedThisCommit` true on ITS first
 * render instead of a surviving instance finding it true on a later one —
 * but every switch-dependent test above this point exercises ONLY the
 * unkeyed shape, so none of them any longer cover what actually ships. The
 * `describe('NoteEditor autosave (keyed — matches production)', ...)` block
 * near the end of this file re-covers the highest-value subset of those same
 * contracts — cross-note leak prevention, correct initial content, and the
 * I2 catch-up — through the keyed harness. The unkeyed tests stay as they
 * are rather than being converted: `useNoteEditorAutosave`'s own doc comments
 * (`seededNoteId`, `lastSentRef`, `willReseedThisCommit`) are written for a
 * surviving instance, and that defensive logic is worth continuing to test
 * directly even though production no longer reaches it exactly that way.
 *
 * `LazyRichTextEditor` is stubbed globally
 * (`@/shared/ui/lazy-rich-text-editor.test-stub`, a preload — see its own
 * comment for why it cannot be registered from this file).
 * `getAdminNoteById`/`updateNote` are NOT stubbed: they run for real,
 * against a faked `prisma.note` delegate, the same way
 * `get-paginated-public-blogs.spec.ts` fakes `prisma.blog` — that means this
 * spec also exercises `updateNoteSchema`'s real `.trim()`, which is exactly
 * what the C2 regression test needs.
 *
 * Fake timers are deliberately NOT used. `useDebounce`'s pending timer and
 * this suite's `waitFor`/manual waits would both be intercepted by
 * `jest.useFakeTimers()`, and untangling which one owns which call to
 * `window.setTimeout` is exactly the kind of unverified assumption this
 * feature's review already found once (the effect-ordering trace). A probe
 * confirmed fake timers DO intercept `window.setTimeout` under happy-dom, but
 * this suite waits out the real `AUTOSAVE_DEBOUNCE_MS` instead — slower
 * (each debounce-dependent test costs about the real 1s), but nothing here
 * depends on an interaction that was not independently checked.
 */
import { StrictMode } from 'react';
import { prisma } from '@byte-of-me/db';
import { toEditorContent } from '@byte-of-me/ui/lib/rich-text-content';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  cleanup,
  configure,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  mock,
  spyOn,
  test,
} from 'bun:test';
import { NextIntlClientProvider } from 'next-intl';
import { toast } from 'sonner';

import { NoteEditor } from './note-editor';

import {
  __resetNoteLocalStore,
  type LocalNote,
  type NoteDetail,
  noteKeys,
} from '@/entities/note';
import { AUTOSAVE_DEBOUNCE_MS } from '@/features/notes/note-editor/lib/use-note-editor-autosave';
// Imported from the stub module's own path, not `@/shared/ui/
// lazy-rich-text-editor`: that specifier only resolves to the stub at
// RUNTIME, via the `build.module` interception
// `lazy-rich-text-editor.test-stub.ts` registers as a preload (see that
// file's comment) — `tsc` still resolves the intercepted specifier to the
// real, on-disk component, which has no `__getMountedValues`/
// `__resetMountedValues` to type-check against. Importing the stub by its
// own path avoids that mismatch, and does not create a second, disconnected
// instance of its module-level `mountedValues` state: Bun caches ES modules
// by resolved file path, and the preload already evaluated this exact file
// once, so this import returns that same cached module — the same closure
// `LazyRichTextEditor` (reached through the intercepted specifier) reads
// from.
import {
  __getCurrentProps,
  __getMountedValues,
  __resetMountedValues,
  __typeInBody,
} from '@/shared/ui/lazy-rich-text-editor.test-stub';

// A minimal, hand-written subset of `messages/en.json`'s `dashboard.note`
// namespace — not an import of the real file, which lives at the `apps/web`
// root, outside `src/`, where `eslint-plugin-import-alias`'s
// `relativeDepth: 0` rule (only a same-directory relative import or the `@/`
// alias, which covers `src/*` only) has no path to it. Copied, not derived,
// so a future rewording of `en.json` has to touch this too — an accepted
// trade-off for a component spec that would otherwise need a new tsconfig
// alias just to reach one file outside `src/`. Values match `en.json`
// exactly (checked against it directly) because several assertions below
// query on the literal rendered text (`screen.getAllByText('Saved')` etc.).
const messages = {
  dashboard: {
    note: {
      loading: 'Loading note…',
      errors: {
        load: 'Could not load your notes.',
        save: 'Could not save the note.',
      },
      fields: {
        title: 'Note title',
        titlePlaceholder: 'Untitled',
      },
      status: {
        saving: 'Saving…',
        saved: 'Saved',
        error: 'Not saved',
        retry: 'Retry',
      },
      view: {
        label: 'Editor view',
        editor: 'Editor',
        markdown: 'Markdown',
      },
      cheatSheet: {
        open: 'Markdown help',
      },
      // The header's export dropdown. Nothing below asserts on these, but the
      // subset has to cover every key the rendered tree ASKS for: a missing one
      // is not a failure, it renders the key path and floods the run with
      // `MISSING_MESSAGE` stack traces that bury the real assertion error.
      export: {
        label: 'Export',
        markdown: 'Download .md',
        pdf: 'Print / Save as PDF',
        notReady: 'The note is still loading.',
      },
      markdown: {
        format: 'Clean up markdown',
        formatted: 'Markdown tidied up.',
        alreadyClean: 'Markdown is already tidy.',
      },
      // The conflict banner. Only its presence is asserted on (via
      // `role="alert"`), but the subset has to carry every key the branch
      // ASKS for — see the note above about `MISSING_MESSAGE` floods.
      conflict: {
        title: 'This note changed somewhere else',
        description:
          'Another device saved it {serverAt}. This browser still holds edits from {localAt} that never reached the server.',
        keepMine: 'Keep mine',
        takeServer: 'Use theirs',
      },
    },
  },
} as const;

interface FakeNoteRow {
  id: string;
  title: string;
  content: string;
  parentId: string | null;
  position: number;
  isPinned: boolean;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  status: string;
  properties: Record<string, string | number | boolean> | null;
  isFolder: boolean;
  labels: { label: { id: string; name: string; color: string | null } }[];
}

function doc(text: string): string {
  return JSON.stringify({
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
  });
}

const NOTE_A: FakeNoteRow = {
  id: 'note-a',
  title: 'Note A',
  content: doc('Body A'),
  parentId: null,
  position: 0,
  isPinned: false,
  archivedAt: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  status: 'draft',
  properties: null,
  isFolder: false,
  labels: [],
};

const NOTE_B: FakeNoteRow = {
  id: 'note-b',
  title: 'Note B',
  content: doc('Body B'),
  parentId: null,
  position: 1,
  isPinned: false,
  archivedAt: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  status: 'draft',
  properties: null,
  isFolder: false,
  labels: [],
};

let notesById: Map<string, FakeNoteRow>;

const findFirstOrThrow = mock((args: { where: { id: string } }) => {
  const row = notesById.get(args.where.id);
  if (!row) return Promise.reject(new Error('Note not found'));
  return Promise.resolve({ ...row });
});

const updateMany = mock(
  (args: { where: { id: string }; data: Record<string, unknown> }) => {
    const row = notesById.get(args.where.id);
    if (!row) return Promise.resolve({ count: 0 });
    Object.assign(row, args.data, { updatedAt: new Date() });
    return Promise.resolve({ count: 1 });
  }
);

Object.defineProperty(prisma, 'note', {
  value: { findFirstOrThrow, updateMany, findMany: mock(() => Promise.resolve([])) },
  writable: true,
  configurable: true,
});

// `updateNote` derives the saved note's `NoteLink` rows from the document it
// just wrote, so a content save reaches three more delegates: it READS the
// stored edges to decide whether anything moved, and only then deletes and
// re-inserts. None is what these tests are about — they exercise the
// autosave's own decisions — but leaving them real means every content save
// tries to open a database connection to the deliberately unreachable test
// URL and fails the save. `findMany` resolving to `[]` against documents that
// carry no links is the "nothing changed" answer, so these saves skip the
// write entirely, which is what production does too.
// `$transaction` here takes the array form `updateNote` uses and simply
// awaits it; the promises inside are already the mocks below.
Object.defineProperty(prisma, 'noteLink', {
  value: {
    findMany: mock(() => Promise.resolve([])),
    deleteMany: mock(() => Promise.resolve({ count: 0 })),
    createMany: mock(() => Promise.resolve({ count: 0 })),
  },
  writable: true,
  configurable: true,
});

Object.defineProperty(prisma, '$transaction', {
  value: mock((operations: Promise<unknown>[]) => Promise.all(operations)),
  writable: true,
  configurable: true,
});

/**
 * The browser's own copy of the notes, for the tests that need one.
 *
 * happy-dom ships no IndexedDB at all (probed, not assumed: `typeof
 * indexedDB` is `undefined` under this preload), so without this every call
 * into `note-local-store.ts` takes its fail-soft branch and answers `null`.
 * That is harmless for the tests above — and it is also why the conflict
 * banner had no coverage: `conflictBase`, the state that SUSPENDS autosave,
 * can only ever be set from a stored record marked dirty. There is no other
 * door into it.
 *
 * Not `mock.module` (banned, §10) and not a stub of `readLocalNote`: this
 * replaces one global object with a fake, which is the same sanctioned
 * technique the Prisma delegates above use, and it means the real
 * `readLocalNote`/`writeLocalNote`/`markLocalNoteSynced` run against it —
 * including `markLocalNoteSynced`'s read-modify-write inside ONE transaction,
 * which is exactly the part a hand-stubbed reader would have thrown away.
 *
 * Deliberately narrow. It implements the three store methods this feature
 * reaches (`get`, `put`, `delete`) and completes a transaction only once
 * every request it issued has settled; `openCursor` (the sync queue's drain,
 * which nothing in this file mounts) is absent, and would land in
 * `listDirtyLocalNotes`'s own `try`/`catch` as the empty queue it fails soft
 * to. It is restored in `afterAll` so no spec file that happens to run after
 * this one inherits a global it never asked for.
 *
 * And it is OFF unless a test asks for it. Every test above this point was
 * written against a browser with no IndexedDB at all, and handing them a
 * working local copy changes what they exercise — one of them turns red,
 * which is a real defect (see the report on the keyed catch-up path) but not
 * this file's to discover by accident. Opt-in keeps the blast radius at the
 * two tests that need a stored record.
 */
const localNotes = new Map<string, LocalNote>();
let localStoreEnabled = false;

interface FakeRequest<T> {
  result: T;
  onsuccess: (() => void) | null;
  onerror: (() => void) | null;
}

function fakeTransaction() {
  let pending = 0;
  let completed = false;

  const settle = () => {
    if (completed || pending > 0) return;
    completed = true;
    transaction.oncomplete?.();
  };

  function issue<T>(work: () => T): FakeRequest<T> {
    const request: FakeRequest<T> = {
      result: undefined as T,
      onsuccess: null,
      onerror: null,
    };
    pending += 1;
    queueMicrotask(() => {
      request.result = work();
      // The handler runs BEFORE the decrement on purpose:
      // `markLocalNoteSynced` issues its `put` from inside this callback, and
      // a transaction that completed between the two would drop the write —
      // which is the very race that function's one-transaction shape exists
      // to close.
      request.onsuccess?.();
      pending -= 1;
      queueMicrotask(settle);
    });
    return request;
  }

  const store = {
    get: (id: string) => issue(() => localNotes.get(id)),
    put: (note: LocalNote) => issue(() => localNotes.set(note.id, note)),
    delete: (id: string) => issue(() => localNotes.delete(id)),
  };

  const transaction = {
    oncomplete: null as (() => void) | null,
    onerror: null as (() => void) | null,
    onabort: null as (() => void) | null,
    objectStore: () => store,
  };

  return transaction;
}

const fakeIndexedDb = {
  open: () => {
    const request = {
      result: {
        // The store always exists, so `onupgradeneeded` never has to fire.
        objectStoreNames: { contains: () => true },
        createObjectStore: () => undefined,
        transaction: () => fakeTransaction(),
      },
      onsuccess: null as (() => void) | null,
      onerror: null as (() => void) | null,
      onupgradeneeded: null as (() => void) | null,
      onblocked: null as (() => void) | null,
    };
    // Refusing to open is a branch `note-local-store.ts` already handles —
    // it resolves `null` and every reader fails soft — so a test that has
    // not opted in gets exactly the browser the tests above assume.
    queueMicrotask(() =>
      localStoreEnabled ? request.onsuccess?.() : request.onerror?.()
    );
    return request;
  },
};

// One `as unknown as` at the installation point rather than a fake widened to
// the whole of `IDBFactory`: `IDBFactory`/`IDBDatabase`/`IDBObjectStore` are
// some forty members between them, and implementing the thirty-odd this
// feature never calls would be noise pretending to be rigour.
Object.defineProperty(globalThis, 'indexedDB', {
  value: fakeIndexedDb as unknown as IDBFactory,
  writable: true,
  configurable: true,
});

function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 60_000 },
      mutations: { retry: false },
    },
  });
}

/**
 * `keyed` defaults to `false`, matching every test below except the
 * `describe` block explicitly named for it near the bottom of this file —
 * see that block's own comment for why the keyed shape gets a separate,
 * smaller set of tests rather than replacing these.
 */
function Harness({
  noteId,
  queryClient,
  keyed = false,
}: {
  noteId: string;
  queryClient: QueryClient;
  keyed?: boolean;
}) {
  return (
    <QueryClientProvider client={queryClient}>
      {/* `timeZone` is required, not decorative: the conflict banner formats
          two timestamps through `useFormatter`, and next-intl refuses to fall
          back to the environment's zone (`ENVIRONMENT_FALLBACK`) rather than
          render a time that would differ between machines. UTC keeps this
          suite's output the same everywhere. */}
      <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
        <NoteEditor key={keyed ? noteId : undefined} noteId={noteId} />
      </NextIntlClientProvider>
    </QueryClientProvider>
  );
}

/** Waits out real wall-clock time. Deliberately not fake timers — see the
 *  file header comment. */
async function wait(ms: number) {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });
}

const SETTLE_MS = AUTOSAVE_DEBOUNCE_MS + 300;

/**
 * Bun's per-test timeout for the tests that wait out the real debounce.
 *
 * Bun defaults to 5s per test. The tests below sit through one to three real
 * `SETTLE_MS` waits — up to ~3.9s of deliberate waiting — plus renders, a
 * mocked round trip and `waitFor` polling. That fits inside 5s on an idle
 * machine and does not on a busy one: the pre-push hook runs `turbo` across
 * every workspace, so the production build competes for the same cores, and
 * "switching noteId never sends the previous note title/content under the new
 * id (warm cache)" died there at 10.8s while passing in ~1.5s run alone.
 *
 * Derived from the debounce rather than picked, so it tracks the thing it is
 * actually waiting for. A generous ceiling costs nothing when tests pass —
 * Bun only spends it on a test that is already failing.
 *
 * Honestly stated: the failure was NOT reproduced locally. A full cold
 * `turbo run test build` passes here with or without this ceiling, and
 * saturating all 11 cores with busy loops did not reproduce it either — a
 * Next production build competes for memory and I/O, not just CPU. What is
 * certain is the mechanism, because the failing run named it: "this test
 * timed out after 5000ms", which is Bun's per-test limit, against a test that
 * spends 2.6s of that budget on deliberate waiting before doing any work.
 * Raising the ceiling cannot make a broken assertion pass — `waitFor` still
 * polls the same conditions — so this removes a demonstrated failure mode
 * without weakening what the tests check.
 *
 * NOT fixed by shortening the debounce or faking timers: the header explains
 * why real timers are used here, and that decision was verified rather than
 * assumed.
 */
const DEBOUNCE_TEST_TIMEOUT_MS = AUTOSAVE_DEBOUNCE_MS * 30;

/**
 * `waitFor`'s own budget, kept BELOW the per-test ceiling above.
 *
 * The order matters for diagnostics: at 15s `waitFor` fails first and names
 * the condition that never held, which is a real error message. If Bun's
 * timeout fired first all anyone would learn is "this test timed out".
 */
configure({ asyncUtilTimeout: AUTOSAVE_DEBOUNCE_MS * 15 });

/**
 * Holds the NEXT `updateMany` call open until `release()` is called, so a
 * test can control exactly what happens WHILE a save is in flight — the
 * interleaving NEW-1 and I2 both need and the fixed real-timer waits above
 * cannot produce on their own (nothing else in this file lets a test see
 * "the request has started but not yet resolved").
 */
function gateNextUpdateMany(): { release: () => void } {
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  updateMany.mockImplementationOnce(
    async (args: { where: { id: string }; data: Record<string, unknown> }) => {
      await gate;
      const row = notesById.get(args.where.id);
      if (!row) return { count: 0 };
      Object.assign(row, args.data, { updatedAt: new Date() });
      return { count: 1 };
    }
  );
  return { release };
}

// `toast` is a plain imported object, so `spyOn` is the sanctioned technique
// here (AGENTS.md §10, mocking option 3). Installed once at module scope
// rather than per test, and only CLEARED between tests: restoring it in an
// `afterEach` would put the real `toast.error` back for every test after the
// first, and the assertions below need the recording to still be in place.
//
// It records a save the `updateMany` counter cannot see at all. A save whose
// title is blank is rejected by `updateNoteSchema`'s
// `title: z.string().trim().min(1)` inside `updateNote`, BEFORE Prisma is
// reached — so `expect(updateMany).not.toHaveBeenCalled()` passes for it
// while the author watches a red "Could not save the note. Invalid input:
// title: String must contain at least 1 character(s)" toast. That is exactly
// how the 2026-08 spurious-save bug stayed invisible to this suite: the only
// observable it had was downstream of the validator that was silently
// swallowing the bug's first symptom.
const errorToast = spyOn(toast, 'error');

beforeEach(() => {
  notesById = new Map([
    [NOTE_A.id, { ...NOTE_A }],
    [NOTE_B.id, { ...NOTE_B }],
  ]);
  findFirstOrThrow.mockClear();
  updateMany.mockClear();
  errorToast.mockClear();
  __resetMountedValues();
  // Every test starts with no local copy AND no store to hold one — the same
  // browser the tests above were written against. Cleared per test both ways:
  // a record a test's own autosave stored must not leak into the next one,
  // where a leftover `dirty: true` would raise a banner nobody asked for.
  localStoreEnabled = false;
  localNotes.clear();
  // The open connection is cached per MODULE, not per test — see
  // `__resetNoteLocalStore`'s own comment in `note-local-store.ts`.
  __resetNoteLocalStore();
});

// Puts the global back exactly as this file found it. Bun runs every spec
// file in one process, so leaving a fake `indexedDB` installed would hand it
// to whichever file runs next — the cross-file leak §10 rules out
// `mock.module` for, reached through a different door.
afterAll(() => {
  Reflect.deleteProperty(globalThis, 'indexedDB');
  __resetNoteLocalStore();
});

// `@testing-library/react` normally registers this in an `afterEach`
// automatically, but only when it detects a Jest/Vitest-shaped global test
// framework already installed — `bun:test`'s `afterEach` has to be imported
// explicitly, so that auto-detection never fires here. Without this, every
// `render()` after the first left its tree in `document.body`, and
// `screen.findByDisplayValue('Note A')` in a later test started matching
// multiple leftover inputs from earlier ones (confirmed: that is exactly how
// this failed before this was added).
afterEach(() => {
  cleanup();
});

describe('NoteEditor autosave', () => {
  test('does not call updateNote between mount and the first debounce settle', async () => {
    const queryClient = makeQueryClient();
    render(<Harness noteId={NOTE_A.id} queryClient={queryClient} />);

    await screen.findByDisplayValue('Note A');
    expect(updateMany).not.toHaveBeenCalled();

    // Nothing was typed, so even once the debounce window fully elapses
    // there is nothing new to send.
    await wait(SETTLE_MS);
    expect(updateMany).not.toHaveBeenCalled();
  }, DEBOUNCE_TEST_TIMEOUT_MS);

  test('switching noteId never sends the previous note title/content under the new id (cold fetch)', async () => {
    const queryClient = makeQueryClient();
    const { rerender } = render(
      <Harness noteId={NOTE_A.id} queryClient={queryClient} />
    );
    await screen.findByDisplayValue('Note A');

    fireEvent.change(screen.getByRole('textbox', { name: 'Note title' }), {
      target: { value: 'Note A edited' },
    });

    // Let the debounce fully catch up to the edit above — and, in the fixed
    // implementation, actually save it — before switching. This is the
    // precondition the race needs: `debouncedTitle === title` (both already
    // "Note A edited") is what makes the "has the debounce caught up" check
    // alone insufficient. Switching away with the debounce still mid-flight
    // would never reach that condition at all and would pass even with the
    // id-seeded guard removed — not a meaningful regression check. Verified
    // empirically, not assumed: with the guard temporarily removed, THIS
    // test (cold) failed exactly like the warm-cache one below — `note`
    // being `undefined` for a render or two during the fetch does not, on
    // its own, protect the commit where `note` first resolves to B; that
    // commit is exactly as exposed as the always-warm case, once the fetch
    // (mocked here as an instantly-resolved promise, same as a
    // cache-warm response in production) is fast enough to land inside a
    // single settled debounce window.
    await wait(SETTLE_MS);
    await waitFor(() => expect(updateMany).toHaveBeenCalledTimes(1));
    updateMany.mockClear();

    // Note B has never been fetched in this QueryClient (cold).
    await act(async () => {
      rerender(<Harness noteId={NOTE_B.id} queryClient={queryClient} />);
    });
    await screen.findByDisplayValue('Note B');

    await wait(SETTLE_MS);

    for (const call of updateMany.mock.calls) {
      const [args] = call as [{ where: { id: string }; data: Record<string, unknown> }];
      if (args.where.id === NOTE_B.id) {
        expect(args.data.title).not.toBe('Note A edited');
      }
    }
  }, DEBOUNCE_TEST_TIMEOUT_MS);

  test('switching noteId never sends the previous note title/content under the new id (warm cache)', async () => {
    const queryClient = makeQueryClient();
    const { rerender } = render(
      <Harness noteId={NOTE_A.id} queryClient={queryClient} />
    );
    await screen.findByDisplayValue('Note A');

    // Warm note B's cache entry first, then come back to A.
    await act(async () => {
      rerender(<Harness noteId={NOTE_B.id} queryClient={queryClient} />);
    });
    await screen.findByDisplayValue('Note B');
    await act(async () => {
      rerender(<Harness noteId={NOTE_A.id} queryClient={queryClient} />);
    });
    await screen.findByDisplayValue('Note A');

    fireEvent.change(screen.getByRole('textbox', { name: 'Note title' }), {
      target: { value: 'Note A edited again' },
    });

    // As in the cold-fetch test above: let the debounce fully settle on the
    // edit (and save it) BEFORE switching, so `debouncedTitle === title`
    // going into the switch — the specific condition that makes the "has the
    // debounce caught up" check alone pass right through, and the reason
    // this specific case is what earns the id-seeded guard's keep (unlike
    // the cold-fetch case above, where `note` being `undefined` mid-fetch
    // already blocks the effect on its own).
    await wait(SETTLE_MS);
    await waitFor(() => expect(updateMany).toHaveBeenCalledTimes(1));
    updateMany.mockClear();

    // Switch to the now-WARM note B: `note` for B is available in the SAME
    // render `noteId` changes in, no `isPending` gap at all.
    await act(async () => {
      rerender(<Harness noteId={NOTE_B.id} queryClient={queryClient} />);
    });
    await screen.findByDisplayValue('Note B');

    await wait(SETTLE_MS);

    for (const call of updateMany.mock.calls) {
      const [args] = call as [{ where: { id: string }; data: Record<string, unknown> }];
      if (args.where.id === NOTE_B.id) {
        expect(args.data.title).not.toBe('Note A edited again');
      }
    }
  }, DEBOUNCE_TEST_TIMEOUT_MS);

  test('the rich-text editor mounts with the loaded note content, not the previous buffer', async () => {
    const queryClient = makeQueryClient();
    const { rerender } = render(
      <Harness noteId={NOTE_A.id} queryClient={queryClient} />
    );
    await screen.findByDisplayValue('Note A');

    await act(async () => {
      rerender(<Harness noteId={NOTE_B.id} queryClient={queryClient} />);
    });
    await screen.findByDisplayValue('Note B');

    const mounted = __getMountedValues();
    expect(mounted.length).toBeGreaterThanOrEqual(2);
    expect(mounted[0]).toEqual(toEditorContent(NOTE_A.content));
    expect(mounted[mounted.length - 1]).toEqual(
      toEditorContent(NOTE_B.content)
    );
  });

  test('a trimmed server echo does not cause an unbounded resave', async () => {
    const queryClient = makeQueryClient();
    render(<Harness noteId={NOTE_A.id} queryClient={queryClient} />);
    await screen.findByDisplayValue('Note A');

    fireEvent.change(screen.getByRole('textbox', { name: 'Note title' }), {
      // Trailing space: `updateNoteSchema`'s `.trim()` makes the server's
      // stored value differ from exactly what was sent.
      target: { value: 'Trimmed Title  ' },
    });

    await wait(SETTLE_MS);
    await waitFor(() => expect(updateMany).toHaveBeenCalledTimes(1));

    // Give the loop every chance to reveal itself: the invalidated detail
    // query re-resolving, another render, another debounce window.
    await wait(SETTLE_MS);
    await wait(SETTLE_MS);

    expect(updateMany).toHaveBeenCalledTimes(1);
  }, DEBOUNCE_TEST_TIMEOUT_MS);

  test('a rejected save leaves a non-"Saved" status, with a retry control', async () => {
    updateMany.mockImplementationOnce(() =>
      Promise.reject(new Error('write failed'))
    );

    const queryClient = makeQueryClient();
    render(<Harness noteId={NOTE_A.id} queryClient={queryClient} />);
    await screen.findByDisplayValue('Note A');

    fireEvent.change(screen.getByRole('textbox', { name: 'Note title' }), {
      target: { value: 'Will fail to save' },
    });

    await wait(SETTLE_MS);
    await waitFor(() => expect(updateMany).toHaveBeenCalledTimes(1));

    // `*AllByText`, not the singular queries: the status is ONE live region
    // carrying the copy twice — a visible `aria-hidden` span and an `sr-only`
    // one, so the eye gets all three states and the screen reader only the
    // transitions worth interrupting for (see `note-editor.tsx`). A singular
    // text query is ambiguous by construction against that. The contract is
    // unchanged: the status says the save failed, never "Saved", and offers
    // the retry.
    await waitFor(() => {
      expect(screen.queryAllByText('Saved')).toHaveLength(0);
    });
    expect(screen.getAllByText('Not saved').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy();
  }, DEBOUNCE_TEST_TIMEOUT_MS);

  test('unmounting with a pending debounce flushes the edit instead of dropping it', async () => {
    const queryClient = makeQueryClient();
    const { unmount } = render(
      <Harness noteId={NOTE_A.id} queryClient={queryClient} />
    );
    await screen.findByDisplayValue('Note A');

    fireEvent.change(screen.getByRole('textbox', { name: 'Note title' }), {
      target: { value: 'Typed just before closing' },
    });

    // Unmount well inside the debounce window — nothing has settled yet.
    await act(async () => {
      unmount();
    });

    await waitFor(() => expect(updateMany).toHaveBeenCalledTimes(1));
    const [args] = updateMany.mock.calls[0] as [
      { where: { id: string }; data: Record<string, unknown> },
    ];
    expect(args.where.id).toBe(NOTE_A.id);
    expect(args.data.title).toBe('Typed just before closing');
  });

  test('a title save disturbs the row-label caches and nothing wider', async () => {
    const queryClient = makeQueryClient();
    const invalidate = spyOn(queryClient, 'invalidateQueries');
    render(<Harness noteId={NOTE_A.id} queryClient={queryClient} />);
    await screen.findByDisplayValue('Note A');
    invalidate.mockClear();

    fireEvent.change(screen.getByRole('textbox', { name: 'Note title' }), {
      target: { value: 'Note A renamed' },
    });
    await wait(SETTLE_MS);
    await waitFor(() => expect(updateMany).toHaveBeenCalledTimes(1));

    const invalidated = invalidate.mock.calls.map(([args]) =>
      JSON.stringify((args as { queryKey: readonly unknown[] }).queryKey)
    );

    // The four row-label families, and only those. `ancestors` in particular
    // must NOT be here: `getNoteAncestors` walks upward from the note's
    // PARENT, so a note's own title appears in no ancestor chain — refetching
    // every breadcrumb on every rename was pure waste.
    expect(invalidated.sort()).toEqual(
      noteKeys
        .listLabels()
        .map((queryKey) => JSON.stringify(queryKey))
        .sort()
    );
  }, DEBOUNCE_TEST_TIMEOUT_MS);

  test('a body save touches links and the graph, never the tree', async () => {
    const queryClient = makeQueryClient();
    const invalidate = spyOn(queryClient, 'invalidateQueries');
    render(<Harness noteId={NOTE_A.id} queryClient={queryClient} />);
    await screen.findByDisplayValue('Note A');
    invalidate.mockClear();

    await act(async () => {
      __typeInBody(' more prose');
    });
    await wait(SETTLE_MS);
    await waitFor(() => expect(updateMany).toHaveBeenCalledTimes(1));

    const invalidated = invalidate.mock.calls.map(([args]) =>
      JSON.stringify((args as { queryKey: readonly unknown[] }).queryKey)
    );

    // Writing prose changes no row's label and moves no row, so the explorer
    // has nothing to re-read. This is the whole point of the narrowing: an
    // autosave fires on every pause in typing, and each of these keys had an
    // ACTIVE query behind it on `/space/notes/<id>` — the root level, one per
    // expanded folder, the breadcrumb — so every pause cost three to five
    // extra server actions, each with its own `requireAdmin()`.
    expect(invalidated).toContain(JSON.stringify(noteKeys.linksAll()));
    expect(invalidated).toContain(JSON.stringify(noteKeys.graph()));
    for (const queryKey of noteKeys.listLabels()) {
      expect(invalidated).not.toContain(JSON.stringify(queryKey));
    }
  }, DEBOUNCE_TEST_TIMEOUT_MS);

  test('a save that resolves after switching notes writes into its OWN cache key, not the note switched to', async () => {
    const queryClient = makeQueryClient();
    const { rerender } = render(
      <Harness noteId={NOTE_A.id} queryClient={queryClient} />
    );
    await screen.findByDisplayValue('Note A');

    const { release } = gateNextUpdateMany();

    fireEvent.change(screen.getByRole('textbox', { name: 'Note title' }), {
      target: { value: 'Note A EDITED' },
    });
    await wait(SETTLE_MS);
    await waitFor(() => expect(updateMany).toHaveBeenCalledTimes(1));

    // Switch to B before the gated save for A resolves. `onSuccess` will
    // fire once it does, with `noteId` (the hook's render-time closure) by
    // then reading "note-b" — the whole point of this test.
    await act(async () => {
      rerender(<Harness noteId={NOTE_B.id} queryClient={queryClient} />);
    });
    await screen.findByDisplayValue('Note B');

    release();
    await wait(300);

    const detailA = queryClient.getQueryData(noteKeys.detail(NOTE_A.id)) as
      | { id: string; title: string }
      | undefined;
    const detailB = queryClient.getQueryData(noteKeys.detail(NOTE_B.id)) as
      | { id: string; title: string }
      | undefined;

    // A's own cache entry must carry A's edit.
    expect(detailA?.id).toBe(NOTE_A.id);
    expect(detailA?.title).toBe('Note A EDITED');
    // B's cache entry must be untouched by A's save landing late — not A's
    // row written in under B's key, which is what used to happen when
    // `onSuccess` read `noteId` from the hook's latest render instead of
    // from the specific `mutate()` call that resolved.
    expect(detailB?.id).toBe(NOTE_B.id);
    expect(detailB?.title).toBe('Note B');
  }, DEBOUNCE_TEST_TIMEOUT_MS);

  test('a save that lands after returning to its note updates the buffer instead of being silently rolled back', async () => {
    const queryClient = makeQueryClient();
    const { rerender } = render(
      <Harness noteId={NOTE_A.id} queryClient={queryClient} />
    );
    await screen.findByDisplayValue('Note A');

    const { release } = gateNextUpdateMany();

    fireEvent.change(screen.getByRole('textbox', { name: 'Note title' }), {
      target: { value: 'Note A EDITED' },
    });
    await wait(SETTLE_MS);
    await waitFor(() => expect(updateMany).toHaveBeenCalledTimes(1));

    // Switch away and back while the save is still gated open.
    await act(async () => {
      rerender(<Harness noteId={NOTE_B.id} queryClient={queryClient} />);
    });
    await screen.findByDisplayValue('Note B');
    await act(async () => {
      rerender(<Harness noteId={NOTE_A.id} queryClient={queryClient} />);
    });
    // Still the pre-save title: A's own cache entry has not been written
    // yet, the save is still gated.
    await screen.findByDisplayValue('Note A');

    release();
    await wait(300);

    // The buffer must catch up once the save that was in flight lands.
    await screen.findByDisplayValue('Note A EDITED');

    // One more keystroke must build on the caught-up text, not on the stale
    // pre-save base — otherwise the save that just succeeded is silently
    // undone the moment the author types again.
    fireEvent.change(screen.getByRole('textbox', { name: 'Note title' }), {
      target: { value: 'Note A EDITEDX' },
    });
    await wait(SETTLE_MS);
    await waitFor(() => expect(updateMany).toHaveBeenCalledTimes(2));
    const lastCall = updateMany.mock.calls[
      updateMany.mock.calls.length - 1
    ] as [{ where: { id: string }; data: Record<string, unknown> }];
    expect(lastCall[0].data.title).toBe('Note A EDITEDX');
  }, DEBOUNCE_TEST_TIMEOUT_MS);

  test('a failed save does not disarm the departure flush on a later switch', async () => {
    const queryClient = makeQueryClient();
    const { rerender } = render(
      <Harness noteId={NOTE_A.id} queryClient={queryClient} />
    );
    await screen.findByDisplayValue('Note A');

    updateMany.mockImplementationOnce(() =>
      Promise.reject(new Error('write failed'))
    );

    fireEvent.change(screen.getByRole('textbox', { name: 'Note title' }), {
      target: { value: 'Will fail then switch' },
    });
    await wait(SETTLE_MS);
    await waitFor(() => expect(updateMany).toHaveBeenCalledTimes(1));

    // Nothing else typed since the failure. If `lastSentRef` still (wrongly)
    // claims this content was already sent, the departure effect will see
    // no divergence and skip — the edit is then lost for good.
    await act(async () => {
      rerender(<Harness noteId={NOTE_B.id} queryClient={queryClient} />);
    });
    await screen.findByDisplayValue('Note B');
    await wait(300);

    await waitFor(() => expect(updateMany).toHaveBeenCalledTimes(2));
    const lastCall = updateMany.mock.calls[
      updateMany.mock.calls.length - 1
    ] as [{ where: { id: string }; data: Record<string, unknown> }];
    expect(lastCall[0].where.id).toBe(NOTE_A.id);
    expect(lastCall[0].data.title).toBe('Will fail then switch');
  }, DEBOUNCE_TEST_TIMEOUT_MS);

  test('a failed save does not disarm the departure flush on unmount', async () => {
    const queryClient = makeQueryClient();
    const { unmount } = render(
      <Harness noteId={NOTE_A.id} queryClient={queryClient} />
    );
    await screen.findByDisplayValue('Note A');

    updateMany.mockImplementationOnce(() =>
      Promise.reject(new Error('write failed'))
    );

    fireEvent.change(screen.getByRole('textbox', { name: 'Note title' }), {
      target: { value: 'Will fail then close' },
    });
    await wait(SETTLE_MS);
    await waitFor(() => expect(updateMany).toHaveBeenCalledTimes(1));

    await act(async () => {
      unmount();
    });

    await waitFor(() => expect(updateMany).toHaveBeenCalledTimes(2));
    const lastCall = updateMany.mock.calls[
      updateMany.mock.calls.length - 1
    ] as [{ where: { id: string }; data: Record<string, unknown> }];
    expect(lastCall[0].where.id).toBe(NOTE_A.id);
    expect(lastCall[0].data.title).toBe('Will fail then close');
  }, DEBOUNCE_TEST_TIMEOUT_MS);

  test('a failed save status does not stick to a different note after switching', async () => {
    const queryClient = makeQueryClient();
    const { rerender } = render(
      <Harness noteId={NOTE_A.id} queryClient={queryClient} />
    );
    await screen.findByDisplayValue('Note A');

    updateMany.mockImplementationOnce(() =>
      Promise.reject(new Error('write failed'))
    );
    fireEvent.change(screen.getByRole('textbox', { name: 'Note title' }), {
      target: { value: 'Will fail on A' },
    });
    await wait(SETTLE_MS);
    await waitFor(() => expect(updateMany).toHaveBeenCalledTimes(1));
    // Two spans carry the status copy — see the retry test above.
    await waitFor(() => {
      expect(screen.queryAllByText('Saved')).toHaveLength(0);
    });
    expect(screen.getAllByText('Not saved').length).toBeGreaterThan(0);

    // Switch to B: B is fine, the failure belongs to A and must not follow.
    await act(async () => {
      rerender(<Harness noteId={NOTE_B.id} queryClient={queryClient} />);
    });
    await screen.findByDisplayValue('Note B');

    expect(screen.queryAllByText('Not saved')).toHaveLength(0);
    expect(screen.getAllByText('Saved').length).toBeGreaterThan(0);
  }, DEBOUNCE_TEST_TIMEOUT_MS);

  test('a BODY save that lands after returning to its note updates the editor, not just the hook buffer', async () => {
    // This is the test round 2's five did not, and could not, express: every
    // one of them drives the title `<input>`, whose value the DOM always
    // reflects directly. The rich-text editor is different — uncontrolled
    // after mount — so a fix that only reaches `useNoteEditorAutosave`'s
    // `content` buffer can leave the editor on screen showing something else
    // entirely, with nothing indicating the two disagree. This is exactly
    // what shipped: round 2's `willReseedThisCommit` correctly caught up the
    // BUFFER, but the editor stayed keyed on `note.id` alone, which had not
    // changed, so it never remounted.
    const queryClient = makeQueryClient();
    const { rerender } = render(
      <Harness noteId={NOTE_A.id} queryClient={queryClient} />
    );
    await screen.findByDisplayValue('Note A');

    const { release } = gateNextUpdateMany();

    await act(async () => {
      __typeInBody(' SAVED');
    });
    await wait(SETTLE_MS);
    await waitFor(() => expect(updateMany).toHaveBeenCalledTimes(1));

    // Switch away and back while the save is still gated open — same
    // interleaving as the title-only I2 test above, through the body.
    await act(async () => {
      rerender(<Harness noteId={NOTE_B.id} queryClient={queryClient} />);
    });
    await screen.findByDisplayValue('Note B');
    await act(async () => {
      rerender(<Harness noteId={NOTE_A.id} queryClient={queryClient} />);
    });
    await screen.findByDisplayValue('Note A');

    release();
    await wait(300);

    // The EDITOR must have been remounted with the caught-up body. Checking
    // `__getMountedValues()` rather than the hook's `content` (which has no
    // DOM presence in this stub, deliberately — this test's whole point is
    // that the buffer catching up is not sufficient) is what makes this
    // assertion able to fail the way round 2 actually failed.
    await waitFor(() => {
      const mounted = __getMountedValues();
      const last = mounted[mounted.length - 1];
      expect(JSON.stringify(last)).toContain('Body A SAVED');
    });

    // One more body edit must build on the caught-up text, not the stale
    // pre-save one — otherwise the save that just landed is silently undone
    // the moment the author edits again, the body-shaped version of I2.
    await act(async () => {
      __typeInBody('X');
    });
    await wait(SETTLE_MS);
    await waitFor(() => expect(updateMany).toHaveBeenCalledTimes(2));
    const lastCall = updateMany.mock.calls[
      updateMany.mock.calls.length - 1
    ] as [{ where: { id: string }; data: Record<string, unknown> }];
    expect(lastCall[0].data.content).toContain('Body A SAVED');
  }, DEBOUNCE_TEST_TIMEOUT_MS);

  test('a successful save settles the title to the server\'s normalised form (deliberate — see use-note-editor-autosave.ts)', async () => {
    // Locks in the round-3 decision on item 3: the reseed mechanism that
    // closes I2 also fires after every OWN successful save, not only a
    // switch-away-and-back, so the trailing space `updateNoteSchema` trims
    // becomes visible in the input settling to the trimmed form about one
    // debounce window after the save round-trips. Kept, not suppressed —
    // this test exists so that behavior stays intentional, not a silent
    // side effect: if it ever stops happening, this fails and says so.
    const queryClient = makeQueryClient();
    render(<Harness noteId={NOTE_A.id} queryClient={queryClient} />);
    await screen.findByDisplayValue('Note A');

    const input = screen.getByRole('textbox', {
      name: 'Note title',
    }) as HTMLInputElement;

    fireEvent.change(input, {
      target: { value: 'Trimmed Title  ' },
    });
    await wait(SETTLE_MS);
    await waitFor(() => expect(updateMany).toHaveBeenCalledTimes(1));

    // `input.value` — the raw DOM value — not `findByDisplayValue`.
    // `findByDisplayValue` applies Testing Library's default normalizer,
    // which trims whitespace before comparing, so `'Trimmed Title  '`
    // (untrimmed — what would still be showing if the reseed this test
    // exists to document never ran) would ALSO match `'Trimmed Title'`.
    // Confirmed empirically: with `findByDisplayValue`, this test stayed
    // green even after deleting `setTitle(note.title)` from the
    // `willReseedThisCommit` branch in `use-note-editor-autosave.ts` — the
    // exact production line it claims to lock in.
    await waitFor(() => {
      expect(input.value).toBe('Trimmed Title');
    });
  }, DEBOUNCE_TEST_TIMEOUT_MS);

  test('a load failure shows the error copy, not the loading copy forever (cold)', async () => {
    findFirstOrThrow.mockImplementationOnce(() =>
      Promise.reject(new Error('not found'))
    );

    const queryClient = makeQueryClient();
    render(<Harness noteId={NOTE_A.id} queryClient={queryClient} />);

    await waitFor(() => {
      expect(screen.getByText('Could not load your notes.')).toBeTruthy();
    });
    expect(screen.queryByText('Loading note…')).toBeNull();
  });

  test('a load failure shows the error copy, not the loading copy forever (switch)', async () => {
    const queryClient = makeQueryClient();
    const { rerender } = render(
      <Harness noteId={NOTE_A.id} queryClient={queryClient} />
    );
    await screen.findByDisplayValue('Note A');

    findFirstOrThrow.mockImplementationOnce(() =>
      Promise.reject(new Error('not found'))
    );
    await act(async () => {
      rerender(<Harness noteId={NOTE_B.id} queryClient={queryClient} />);
    });

    await waitFor(() => {
      expect(screen.getByText('Could not load your notes.')).toBeTruthy();
    });
    expect(screen.queryByText('Loading note…')).toBeNull();
  });
});

/**
 * Opening a note is a READ. Whatever the editor and the seed effect do
 * between the click and the first render, no `updateNote` may leave the
 * browser until the author changes something.
 *
 * Both tests here reproduce a way the shipped code broke that, found by
 * manual smoke testing after this suite's 192 tests missed both. They render
 * `keyed`, the shape `note-manager.tsx` actually mounts, and assert on TWO
 * observables — `updateMany` (a save that reached the database) and
 * `toast.error` (a save that left the browser and was rejected on arrival) —
 * because the original bug produced one of each and the suite could only see
 * the second one's consequences.
 */
describe('NoteEditor — opening a note saves nothing', () => {
  test('the editor reporting the document it opened with is not an edit', async () => {
    // The real editor emits `onUpdate` while opening a stored document: the
    // `TableOfContents` extension assigns heading ids in a transaction
    // dispatched during Tiptap's `create` event, and the reported JSON also
    // carries parse-time attribute defaults, so it is never byte-identical to
    // the string that was loaded. Fed through `onChange` as if the author had
    // typed, that difference is a full-content save of a document nobody
    // touched — every open, bumping `updatedAt` and costing a round-trip.
    // `lazy-rich-text-editor.test-stub.ts` now reproduces that emit (see its
    // own comment); before it did, this test could not have been written.
    const queryClient = makeQueryClient();
    render(<Harness noteId={NOTE_A.id} queryClient={queryClient} keyed />);
    await screen.findByDisplayValue('Note A');

    // Two full debounce windows: one for the emit itself to settle, one to
    // catch a save that only fires after the first refetch lands.
    await wait(SETTLE_MS);
    await wait(SETTLE_MS);

    expect(updateMany).not.toHaveBeenCalled();
    expect(errorToast).not.toHaveBeenCalled();
  }, DEBOUNCE_TEST_TIMEOUT_MS);

  test('reopening a note already in the query cache saves nothing (StrictMode)', async () => {
    // The reported repro: click a note you have opened before in this
    // session. TanStack serves the cached row on the FIRST render, so the
    // seed effect runs in the mount commit — and in development
    // (`reactStrictMode: true`) React immediately tears that commit's effects
    // down and sets them up again. The departure effect's cleanup fires in
    // between, when `lastSentRef` already holds the seeded note but
    // `latestBufferRef` still holds the pre-seed `{ title: '', content: '' }`
    // of the mount render, because the seed effect's `setTitle`/`setContent`
    // have not been rendered yet. It reads that as "an unsaved edit" and
    // flushes it: a blank `updateNote`, rejected by `updateNoteSchema` with a
    // red toast, and — worse — `lastSentRef` left claiming blank was sent, so
    // the autosave effect then rewrites the entire note back over itself one
    // debounce later.
    const queryClient = makeQueryClient();
    queryClient.setQueryData(noteKeys.detail(NOTE_A.id), { ...NOTE_A });

    // `<StrictMode>` must be the ROOT element handed to `render`, matching
    // what `reactStrictMode: true` does (it wraps the whole app tree), and
    // not a wrapper inside `Harness`. That is not cosmetic: with StrictMode
    // nested one component deeper, React's dev remount pass was observed to
    // run its cleanup AFTER the seeded values had already reached a render,
    // so `latestBufferRef` was current and the bug did not reproduce at all
    // — the test passed against the broken code. Checked by running it both
    // ways with the fix reverted.
    render(
      <StrictMode>
        <Harness noteId={NOTE_A.id} queryClient={queryClient} keyed />
      </StrictMode>
    );
    await screen.findByDisplayValue('Note A');

    await wait(SETTLE_MS);
    await wait(SETTLE_MS);

    expect(errorToast).not.toHaveBeenCalled();
    expect(updateMany).not.toHaveBeenCalled();
  }, DEBOUNCE_TEST_TIMEOUT_MS);
});

/**
 * The keyed shape production actually ships: `key={activeId}` on
 * `<NoteEditor>` in `note-manager.tsx` means every note switch unmounts the
 * previous instance and mounts a fresh one, never reusing it — see this
 * file's header comment for why every test above this point, which all
 * reuse the same instance across a switch, no longer exercises what runs in
 * production, and why they are kept anyway rather than converted. This
 * block re-covers the three highest-value contracts through `Harness`'s
 * `keyed: true` option: no cross-note leak on switch, correct initial
 * content after a switch, and the I2 catch-up (a save that lands after
 * returning to its note must still reach the buffer) — not every test
 * above, since several of those exist specifically to defend
 * `seededNoteId`/`lastSentRef`/`willReseedThisCommit`, machinery that only
 * an instance SURVIVING a switch can exercise at all.
 */
describe('NoteEditor autosave (keyed — matches production)', () => {
  // NOT a copy of the unkeyed "switching noteId never sends the previous
  // note title/content under the new id" test: that one guards a same-
  // INSTANCE race (C1) that cannot happen once a note switch tears the
  // instance down and builds a fresh one — confirmed empirically, not
  // assumed: removing `isSeededForCurrentNote` from the unkeyed autosave
  // effect's guard turns that test red, but leaves every keyed test in this
  // block green, because there is no surviving instance left for a stale
  // commit to leak through. Copying that test here anyway would pass
  // unconditionally regardless of whether the real, keyed-relevant
  // protection worked — exactly the "green test that proves nothing"
  // pattern this plan has already shipped once. The mechanism THIS shape
  // actually depends on for the same end-user contract is the departure
  // effect's flush, which closes over `departingId` at the OLD instance's
  // own unmount — so this test targets THAT: a pending, not-yet-saved edit
  // on the note being switched AWAY FROM must flush under its OWN id, not
  // resurface under the id of the note switched to.
  test('switching away flushes the departing note under its OWN id, never under the note switched to (keyed)', async () => {
    const queryClient = makeQueryClient();
    const { rerender } = render(
      <Harness noteId={NOTE_A.id} queryClient={queryClient} keyed />
    );
    await screen.findByDisplayValue('Note A');

    // Left mid-debounce, deliberately: the flush this test cares about is
    // the unmount-triggered one, not the regular debounced autosave.
    fireEvent.change(screen.getByRole('textbox', { name: 'Note title' }), {
      target: { value: 'Note A edited' },
    });

    await act(async () => {
      rerender(
        <Harness noteId={NOTE_B.id} queryClient={queryClient} keyed />
      );
    });
    await screen.findByDisplayValue('Note B');

    await waitFor(() => expect(updateMany).toHaveBeenCalledTimes(1));
    const [flushArgs] = updateMany.mock.calls[0] as [
      { where: { id: string }; data: Record<string, unknown> },
    ];
    expect(flushArgs.where.id).toBe(NOTE_A.id);
    expect(flushArgs.data.title).toBe('Note A edited');

    // And nothing sent afterwards (B's own settle, if any) carries A's text
    // under B's id.
    await wait(SETTLE_MS);
    for (const call of updateMany.mock.calls) {
      const [args] = call as [
        { where: { id: string }; data: Record<string, unknown> },
      ];
      if (args.where.id === NOTE_B.id) {
        expect(args.data.title).not.toBe('Note A edited');
      }
    }
  }, DEBOUNCE_TEST_TIMEOUT_MS);

  test('the rich-text editor mounts with the loaded note content, not the previous buffer (keyed)', async () => {
    const queryClient = makeQueryClient();
    const { rerender } = render(
      <Harness noteId={NOTE_A.id} queryClient={queryClient} keyed />
    );
    await screen.findByDisplayValue('Note A');

    await act(async () => {
      rerender(
        <Harness noteId={NOTE_B.id} queryClient={queryClient} keyed />
      );
    });
    await screen.findByDisplayValue('Note B');

    const mounted = __getMountedValues();
    expect(mounted.length).toBeGreaterThanOrEqual(2);
    expect(mounted[0]).toEqual(toEditorContent(NOTE_A.content));
    expect(mounted[mounted.length - 1]).toEqual(
      toEditorContent(NOTE_B.content)
    );
  });

  test('a save that lands after returning to its note updates the buffer instead of being silently rolled back (keyed)', async () => {
    const queryClient = makeQueryClient();
    const { rerender } = render(
      <Harness noteId={NOTE_A.id} queryClient={queryClient} keyed />
    );
    await screen.findByDisplayValue('Note A');

    const { release } = gateNextUpdateMany();

    fireEvent.change(screen.getByRole('textbox', { name: 'Note title' }), {
      target: { value: 'Note A EDITED' },
    });
    await wait(SETTLE_MS);
    await waitFor(() => expect(updateMany).toHaveBeenCalledTimes(1));

    // Switch away and back — each transition unmounts and mounts a FRESH
    // instance under the keyed shape, unlike the equivalent test above.
    await act(async () => {
      rerender(
        <Harness noteId={NOTE_B.id} queryClient={queryClient} keyed />
      );
    });
    await screen.findByDisplayValue('Note B');
    await act(async () => {
      rerender(
        <Harness noteId={NOTE_A.id} queryClient={queryClient} keyed />
      );
    });
    // Still the pre-save title: A's own cache entry has not been written
    // yet, the save is still gated — this fresh instance seeded from
    // whatever the query cache held at ITS mount, same as the unmounted
    // one did.
    await screen.findByDisplayValue('Note A');

    release();
    await wait(300);

    // The buffer must catch up once the save that was in flight lands —
    // via THIS (third, fresh) instance's own seed effect finding
    // `willReseedThisCommit` true on a later render, not via a surviving
    // instance the way the unkeyed version of this test exercises.
    await screen.findByDisplayValue('Note A EDITED');

    fireEvent.change(screen.getByRole('textbox', { name: 'Note title' }), {
      target: { value: 'Note A EDITEDX' },
    });
    await wait(SETTLE_MS);
    await waitFor(() => expect(updateMany).toHaveBeenCalledTimes(2));
    const lastCall = updateMany.mock.calls[
      updateMany.mock.calls.length - 1
    ] as [{ where: { id: string }; data: Record<string, unknown> }];
    expect(lastCall[0].data.title).toBe('Note A EDITEDX');
  }, DEBOUNCE_TEST_TIMEOUT_MS);
});

/**
 * The conflict banner decides whether autosave is SUSPENDED, which makes a
 * false positive the most expensive failure in this hook: the author keeps
 * typing, the status line says nothing is wrong, and not one keystroke
 * leaves the browser. Both tests below therefore assert on `updateMany` —
 * whether a save reached the database — and treat the banner's presence as
 * the corroborating detail rather than the contract.
 *
 * They are the first tests in this file to give the browser a local copy at
 * all; see the fake IndexedDB near the top for why that is the only way in.
 */
describe('NoteEditor conflict banner', () => {
  /**
   * `NOTE_A` as the LOCAL store holds it — a `NoteDetail`, whose `labels` are
   * summaries, not the join rows Prisma selects into `FakeNoteRow`.
   */
  function localDetail(row: FakeNoteRow): NoteDetail {
    const { labels, ...rest } = row;
    return { ...rest, labels: labels.map((join) => join.label) };
  }

  /**
   * Gives this browser a stored copy carrying edits that never reached the
   * server — and, with it, an IndexedDB to hold one. Both halves belong
   * together: a record nothing can read is not a precondition, it is a
   * no-op that would leave these tests passing for the wrong reason.
   */
  function storeDirtyCopy(row: FakeNoteRow, baseUpdatedAt: number): void {
    localStoreEnabled = true;
    localNotes.set(row.id, {
      id: row.id,
      detail: localDetail(row),
      baseUpdatedAt,
      dirty: true,
      savedAt: baseUpdatedAt,
    });
  }

  test('the author\'s OWN save does not become a conflict against a stale local base', async () => {
    // The reported shape: a note whose stored copy was dirty when it was
    // opened. Nothing is wrong yet — the server row is exactly what those
    // unsent edits were based on — but `conflictBase` is now set, and the
    // effect that sets it runs only on a `noteId` change, so before the fix
    // nothing could ever take it back down for the rest of the session.
    const base = NOTE_A.updatedAt.getTime();
    storeDirtyCopy(NOTE_A, base);

    const queryClient = makeQueryClient();
    render(<Harness noteId={NOTE_A.id} queryClient={queryClient} keyed />);
    await screen.findByDisplayValue('Note A');

    // The author's own first save. `updateMany` stamps a fresh `updatedAt`,
    // which is what pushes the server row PAST `conflictBase.base` — the
    // author conflicting with nobody but themselves.
    fireEvent.change(screen.getByRole('textbox', { name: 'Note title' }), {
      target: { value: 'Note A edited once' },
    });
    await wait(SETTLE_MS);
    await waitFor(() => expect(updateMany).toHaveBeenCalledTimes(1));

    // THE assertion. A second edit is what a suspended autosave swallows:
    // the banner going up stops the effect at its `hasConflict` guard, so
    // this save never leaves and the note silently stops being saved from
    // here on. `waitFor` rather than a bare `expect` so the failure names the
    // condition that never held rather than a count read one tick early.
    fireEvent.change(screen.getByRole('textbox', { name: 'Note title' }), {
      target: { value: 'Note A edited twice' },
    });
    await wait(SETTLE_MS);
    await waitFor(() => expect(updateMany).toHaveBeenCalledTimes(2));
    const lastCall = updateMany.mock.calls[
      updateMany.mock.calls.length - 1
    ] as [{ where: { id: string }; data: Record<string, unknown> }];
    expect(lastCall[0].data.title).toBe('Note A edited twice');

    // And the author was never asked a question that had no second answer.
    expect(screen.queryByRole('alert')).toBeNull();
  }, DEBOUNCE_TEST_TIMEOUT_MS);

  test('a genuinely newer server row still raises the banner and suspends autosave', async () => {
    // The half that must survive the fix above: this browser holds unsent
    // edits, and ANOTHER device has written the note since they were made.
    // Nothing here is this browser's own echo, so nothing acknowledges the
    // base and the question stands.
    const base = NOTE_A.updatedAt.getTime();
    storeDirtyCopy(NOTE_A, base);
    notesById.set(NOTE_A.id, {
      ...NOTE_A,
      updatedAt: new Date(base + 60_000),
    });

    const queryClient = makeQueryClient();
    render(<Harness noteId={NOTE_A.id} queryClient={queryClient} keyed />);
    await screen.findByDisplayValue('Note A');

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeTruthy();
    });

    // Typing under an unanswered banner must not resolve it by itself, in
    // favour of this browser, one debounce later — the loss the banner
    // exists to prevent, and the reason the suspension is not merely
    // cosmetic. This is also what proves the two tests are not both vacuous:
    // the same fake store that stays quiet above genuinely reaches
    // `conflictBase` here.
    fireEvent.change(screen.getByRole('textbox', { name: 'Note title' }), {
      target: { value: 'Typed while the banner is up' },
    });
    await wait(SETTLE_MS);
    await wait(SETTLE_MS);

    expect(updateMany).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toBeTruthy();
  }, DEBOUNCE_TEST_TIMEOUT_MS);
});

describe('NoteEditor raw-markdown view toggle', () => {
  // Contract: the header's segmented control drives the editor's
  // `markdownMode` prop — the actual textarea swap is the shared component's
  // behavior, covered in `packages/ui`. What can break HERE is the wiring
  // (state → prop) and the reset-on-switch (via the widget's `key={noteId}`).
  test('the Markdown button turns raw mode on, the Editor button back off', async () => {
    const queryClient = makeQueryClient();
    render(<Harness noteId={NOTE_A.id} queryClient={queryClient} keyed />);
    await screen.findByDisplayValue('Note A');

    expect(__getCurrentProps()?.markdownMode).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: 'Markdown' }));
    expect(__getCurrentProps()?.markdownMode).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Editor' }));
    expect(__getCurrentProps()?.markdownMode).toBe(false);
  });

  test('raw mode resets when switching notes under the keyed shape', async () => {
    const queryClient = makeQueryClient();
    const { rerender } = render(
      <Harness noteId={NOTE_A.id} queryClient={queryClient} keyed />
    );
    await screen.findByDisplayValue('Note A');

    fireEvent.click(screen.getByRole('button', { name: 'Markdown' }));
    expect(__getCurrentProps()?.markdownMode).toBe(true);

    await act(async () => {
      rerender(<Harness noteId={NOTE_B.id} queryClient={queryClient} keyed />);
    });
    await screen.findByDisplayValue('Note B');

    // A fresh instance mounted (key change) — its own local state, WYSIWYG.
    expect(__getCurrentProps()?.markdownMode).toBe(false);
  });
});

describe('NoteEditor cheat-sheet trigger', () => {
  // The DIALOG belongs to the widget; the editor's contract is only "the
  // help button asks for it" — and stays absent when nothing would answer.
  test('the help button calls onOpenCheatSheet', async () => {
    const queryClient = makeQueryClient();
    const onOpen = mock();
    render(
      <QueryClientProvider client={queryClient}>
        <NextIntlClientProvider locale="en" messages={messages}>
          <NoteEditor noteId={NOTE_A.id} onOpenCheatSheet={onOpen} />
        </NextIntlClientProvider>
      </QueryClientProvider>
    );
    await screen.findByDisplayValue('Note A');

    fireEvent.click(screen.getByRole('button', { name: 'Markdown help' }));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  test('no help button renders without the callback', async () => {
    const queryClient = makeQueryClient();
    render(<Harness noteId={NOTE_A.id} queryClient={queryClient} />);
    await screen.findByDisplayValue('Note A');

    expect(
      screen.queryByRole('button', { name: 'Markdown help' })
    ).toBeNull();
  });
});
