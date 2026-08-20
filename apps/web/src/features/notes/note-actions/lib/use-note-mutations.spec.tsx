/**
 * What a create says about itself while it is in flight.
 *
 * The tree draws its pending row from the MUTATION CACHE rather than from a
 * `useMutation` result, and that is not a stylistic choice: the row menu's
 * "New note inside" runs its create from `useNoteActionItems`, a hook Radix
 * only mounts while the menu is open, so the observer — and its `isPending` —
 * is gone before the server has answered. Two things have to hold for the row
 * to appear at all, and both are asserted here:
 *
 *  1. a pending create is findable by `CREATE_NOTE_MUTATION_KEY`, and says
 *     which level it is writing into;
 *  2. it stays pending until that level has RE-READ, not merely until the
 *     server answers — otherwise the row vanishes one round trip before the
 *     real one arrives, which is the gap the author reads as nothing having
 *     happened.
 *
 * The level query here is a plain fake rather than `getNoteChildren`: what is
 * under test is the invalidation the create hands back, and a fake is the only
 * way to hold that refetch open long enough to observe.
 */
import { prisma } from '@byte-of-me/db';
import {
  QueryClient,
  QueryClientProvider,
  useInfiniteQuery,
  useMutationState,
} from '@tanstack/react-query';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { NextIntlClientProvider } from 'next-intl';

import {
  CREATE_NOTE_MUTATION_KEY,
  createTargetParentId,
  useCreateNote,
  useNoteMutations,
} from './use-note-mutations';

import { hasNoteBeenDeleted, noteKeys } from '@/entities/note';
import { privateStorage } from '@/shared/api/s3-storage-api';

const messages = {
  dashboard: {
    note: {
      untitled: 'Untitled',
      untitledFolder: 'New folder',
      errors: {
        create: 'Could not create the note.',
        delete: 'Could not delete the note.',
      },
      toasts: { deleted: 'Note deleted' },
    },
  },
} as const;

const AT = new Date('2026-01-01T00:00:00.000Z');

const findFirst = mock(() => Promise.resolve(null));
const create = mock((args: { data: Record<string, unknown> }) =>
  Promise.resolve({
    id: 'new-note-id',
    content: '',
    createdAt: AT,
    updatedAt: AT,
    status: 'draft',
    properties: null,
    isFolder: false,
    labels: [],
    ...args.data,
  })
);

/** `deleteNote`'s owner-scoped read: folder-1 → child-1. */
const findMany = mock(() =>
  Promise.resolve([
    { id: 'folder-1', parentId: null },
    { id: 'child-1', parentId: 'folder-1' },
  ])
);
const deleteMany = mock(() => Promise.resolve({ count: 2 }));

Object.defineProperty(prisma, 'note', {
  value: { findFirst, create, findMany, deleteMany },
  writable: true,
  configurable: true,
});

// `deleteNote` sweeps the attachment objects the cascade cannot take, so it
// reads this delegate on the way through. Unstubbed, the action reaches for a
// real database — which is refused here, but only after a timeout that reads
// like a hang rather than a missing stub.
Object.defineProperty(prisma, 'noteDocument', {
  value: { findMany: mock().mockResolvedValue([]) },
  writable: true,
  configurable: true,
});
Object.defineProperty(privateStorage, 'deleteFile', {
  value: mock().mockResolvedValue(undefined),
  writable: true,
  configurable: true,
});

/** Resolves the NEXT read of the level only once `release()` runs. */
let gateLevel: (() => void) | null = null;
let levelReads = 0;
/**
 * Side effects of `onSuccess`, in the order they actually happened. Only the
 * relative order matters — see the ordering test at the bottom of this file.
 */
let effects: string[] = [];

async function readLevel(): Promise<{ rows: []; nextCursor: null }> {
  levelReads += 1;
  if (levelReads > 1) {
    effects.push('invalidate');
    await new Promise<void>((resolve) => {
      gateLevel = resolve;
    });
  }
  return { rows: [], nextCursor: null };
}

/** The level the tree would draw a pending row in, exactly as the panel reads it. */
function Probe({ onCreated }: { onCreated?: (noteId: string) => void }) {
  const createNote = useCreateNote(onCreated);
  const pending = useMutationState({
    filters: { mutationKey: CREATE_NOTE_MUTATION_KEY, status: 'pending' },
    select: (mutation) => createTargetParentId(mutation.state.variables),
  });

  useInfiniteQuery({
    queryKey: noteKeys.children('folder-1', false),
    queryFn: readLevel,
    initialPageParam: null as string | null,
    getNextPageParam: () => null,
  });

  return (
    <div>
      <button
        type="button"
        onClick={() => createNote.mutate({ parentId: 'folder-1' })}
      >
        create
      </button>
      <p data-testid="pending">{pending.join(',')}</p>
    </div>
  );
}

function renderProbe(onCreated?: (noteId: string) => void) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={messages}>
        <Probe onCreated={onCreated} />
      </NextIntlClientProvider>
    </QueryClientProvider>
  );
}

function pendingLevels(): string {
  return screen.getByTestId('pending').textContent ?? '';
}

beforeEach(() => {
  levelReads = 0;
  gateLevel = null;
  effects = [];
  findFirst.mockClear();
  create.mockClear();
  findMany.mockClear();
  deleteMany.mockClear();
});

afterEach(cleanup);

describe('useCreateNote', () => {
  test('names the level it is writing into while it is in flight', async () => {
    renderProbe();
    // The level's first read has to settle first, so the refetch below is the
    // one being held open.
    await waitFor(() => expect(levelReads).toBe(1));

    fireEvent.click(screen.getByRole('button', { name: 'create' }));

    await waitFor(() => expect(pendingLevels()).toBe('folder-1'));
  });

  test('stays pending until the level it lands in has re-read', async () => {
    renderProbe();
    await waitFor(() => expect(levelReads).toBe(1));

    fireEvent.click(screen.getByRole('button', { name: 'create' }));

    // The row exists on the server by now — the refetch it triggered is what
    // is still outstanding, and the pending row belongs to the author until
    // the real one can replace it.
    await waitFor(() => expect(create).toHaveBeenCalled());
    await waitFor(() => expect(levelReads).toBe(2));
    expect(pendingLevels()).toBe('folder-1');

    gateLevel?.();

    await waitFor(() => expect(pendingLevels()).toBe(''));
  });

  /**
   * The create-and-open that created the note and then never opened it.
   *
   * `onCreated` is where the caller navigates, and it has to be called BEFORE
   * the level invalidation goes out — not because of anything TanStack does,
   * but because `router.push` and every server action share one queue in
   * Next's app router, and a navigation dispatched on top of a single pending
   * action strands everything dispatched after it (the file under test carries
   * the full mechanism and the measurement). The order of these two effects is
   * the whole difference between a note that opens and a note that leaves the
   * editor on its skeleton for good, so it is asserted rather than left to
   * read as arbitrary.
   */
  test('opens the new note before invalidating the level it landed in', async () => {
    renderProbe(() => effects.push('open'));
    await waitFor(() => expect(levelReads).toBe(1));

    fireEvent.click(screen.getByRole('button', { name: 'create' }));

    await waitFor(() => expect(effects).toContain('invalidate'));
    expect(effects).toEqual(['open', 'invalidate']);

    gateLevel?.();
    await waitFor(() => expect(pendingLevels()).toBe(''));
  });
});

/**
 * What a permanent delete makes knowable, and WHEN.
 *
 * The editor's departure flush asks `hasNoteBeenDeleted` from inside the
 * unmount this delete causes — and that unmount is caused by `onRemoved`,
 * which runs inside `onSuccess`. So "the note is gone" has to be true at that
 * instant, not one dispatch later: `Mutation.execute` writes `state.data` only
 * when it dispatches `success`, i.e. after `onSuccess` has been awaited, so
 * the cascade cannot be read back off the mutation at the moment it is
 * needed. It is recorded in the mutation function instead.
 */
describe('useNoteMutations remove', () => {
  /** Reports every id, and what the guard says about the DESCENDANT then. */
  function DeleteProbe({ onRemoved }: { onRemoved: (noteId: string) => void }) {
    const { remove } = useNoteMutations({ onRemoved });

    return (
      <button type="button" onClick={() => remove.mutate('folder-1')}>
        delete
      </button>
    );
  }

  function renderDeleteProbe(onRemoved: (noteId: string) => void) {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <NextIntlClientProvider locale="en" messages={messages}>
          <DeleteProbe onRemoved={onRemoved} />
        </NextIntlClientProvider>
      </QueryClientProvider>
    );

    return queryClient;
  }

  test('reports every id the cascade destroyed, target first', async () => {
    const removed: string[] = [];
    renderDeleteProbe((noteId) => removed.push(noteId));

    fireEvent.click(screen.getByRole('button', { name: 'delete' }));

    await waitFor(() => expect(removed.length).toBe(2));
    expect(removed).toEqual(['folder-1', 'child-1']);
  });

  // The descendant, answered at the only moment the flush can ask. Deleting a
  // FOLDER destroys notes whose ids are nowhere in the mutation's variables,
  // and an editor open on one of them was still sending its pending keystroke
  // into a row the database had permanently dropped.
  test('knows a descendant is gone by the time the editor is told to close', async () => {
    // One answer per report, in report order — so `[0]` is the answer given
    // for the FOLDER, i.e. before the descendant's own turn could have
    // established anything.
    const guardAnswers: boolean[] = [];
    const queryClient = renderDeleteProbe(() => {
      guardAnswers.push(hasNoteBeenDeleted(queryClient, 'child-1'));
    });

    fireEvent.click(screen.getByRole('button', { name: 'delete' }));

    await waitFor(() => expect(guardAnswers.length).toBe(2));
    expect(guardAnswers[0]).toBe(true);
  });
});

/**
 * Which level a pending create is writing into — the answer the tree draws a
 * skeleton row at.
 *
 * The interesting case is the one that is not a create's variables at all. It
 * used to answer "the root", which is right only for as long as the shape
 * never changes: rename or re-nest `parentId` and every pending row would have
 * appeared at the top level instead, a wrong row in a right-looking place with
 * nothing to trace it by. It says "no level" instead, and the panel draws
 * nothing.
 */
describe('createTargetParentId', () => {
  test('names the level a create is writing into', () => {
    expect(createTargetParentId({ parentId: 'folder-1' })).toBe('folder-1');
  });

  test('reads the root from every way of asking for one', () => {
    // `mutate({})`, `mutate()`, the draft row's `{ isFolder, title }`, and an
    // explicit null.
    expect(createTargetParentId({})).toBeNull();
    expect(createTargetParentId(undefined)).toBeNull();
    expect(createTargetParentId({ isFolder: true, title: 'Ideas' })).toBeNull();
    expect(createTargetParentId({ parentId: null })).toBeNull();
  });

  test('claims no level for variables it does not recognise', () => {
    // A renamed or re-nested field, and a variables shape that is not an
    // object at all. Neither is the root.
    expect(createTargetParentId({ parent: 'folder-1' })).toBeUndefined();
    expect(
      createTargetParentId({ target: { parentId: 'folder-1' } })
    ).toBeUndefined();
    expect(createTargetParentId('folder-1')).toBeUndefined();
    expect(createTargetParentId({ parentId: 7 })).toBeUndefined();
  });
});
