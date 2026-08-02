/**
 * `NoteTreePanel` uses no cmdk at all — a plain `useQuery` plus a
 * `useMutation` — so every one of its states is directly testable, with no
 * excuse for shipping it untested. Covers loading/error/empty/success, the
 * create button's disabled-while-pending state, the create-failure toast,
 * and two related regressions review found in the same gate: M6, a failed
 * BACKGROUND refetch (the create mutation's own invalidation can trigger
 * exactly one) must not blank a NON-EMPTY tree that is still perfectly
 * good; and M-b, that same failure must also not blank a LEGITIMATELY
 * EMPTY tree — the `NoteEmpty` "create your first note" state, not the
 * load-error message, exactly when a first-time author has just created
 * their very first note and the tree's own invalidation-triggered refetch
 * happens to fail. `tree.length === 0` alone could not tell these two
 * failures apart from a genuine first-load failure; `isLoadingError` can.
 */
import { prisma } from '@byte-of-me/db';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import {
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

import { NoteTreePanel } from './note-tree-panel';

import { noteKeys } from '@/entities/note';

const messages = {
  dashboard: {
    note: {
      untitled: 'Untitled',
      search: { trigger: 'Search notes' },
      actions: { create: 'New note' },
      tree: { expandAriaLabel: 'Expand', collapseAriaLabel: 'Collapse' },
      empty: { title: 'No notes yet.' },
      errors: {
        load: 'Could not load your notes.',
        create: 'Could not create the note.',
      },
    },
  },
} as const;

interface FakeNoteRow {
  id: string;
  title: string;
  parentId: string | null;
  position: number;
  isPinned: boolean;
  archivedAt: Date | null;
  updatedAt: Date;
}

const NOTE_A: FakeNoteRow = {
  id: 'note-a',
  title: 'Note A',
  parentId: null,
  position: 0,
  isPinned: false,
  archivedAt: null,
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

let findManyImpl: () => Promise<FakeNoteRow[]>;
const findMany = mock(() => findManyImpl());
const findFirst = mock(() => Promise.resolve(null));
const create = mock(
  (args: { data: Record<string, unknown> }) =>
    Promise.resolve({
      id: 'new-note-id',
      content: '',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...args.data,
    })
);

Object.defineProperty(prisma, 'note', {
  value: { findMany, findFirst, create },
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

function Harness({
  queryClient,
  onSelect = () => {},
}: {
  queryClient: QueryClient;
  onSelect?: (id: string) => void;
}) {
  return (
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={messages}>
        <NoteTreePanel
          activeId={null}
          onSelect={onSelect}
          onOpenSearch={() => {}}
        />
      </NextIntlClientProvider>
    </QueryClientProvider>
  );
}

/** Resolves the NEXT `findMany`/`create` call only once `release()` runs —
 *  same technique as `note-editor.spec.tsx`'s `gateNextUpdateMany`. */
function gateNextFindMany(rows: FakeNoteRow[]): { release: () => void } {
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  findManyImpl = async () => {
    await gate;
    return rows;
  };
  return { release };
}

function gateNextCreate(): { release: () => void } {
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  create.mockImplementationOnce(async (args: { data: Record<string, unknown> }) => {
    await gate;
    return {
      id: 'new-note-id',
      content: '',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...args.data,
    };
  });
  return { release };
}

beforeEach(() => {
  findManyImpl = () => Promise.resolve([NOTE_A]);
  findMany.mockClear();
  findFirst.mockClear().mockResolvedValue(null);
  create.mockClear();
});

afterEach(() => {
  cleanup();
});

describe('NoteTreePanel', () => {
  test('shows the skeleton while the tree is loading', async () => {
    const { release } = gateNextFindMany([NOTE_A]);
    const queryClient = makeQueryClient();
    const { container } = render(<Harness queryClient={queryClient} />);

    // `NoteTreeSkeleton` renders no text of its own; its rows are
    // `@byte-of-me/ui`'s `Skeleton`, marked by its own `animate-pulse`
    // class (checked directly in `packages/ui/src/skeleton.tsx`) — NOT the
    // lucide icons' own `aria-hidden="true"`, which the header's Search/
    // Plus icons carry regardless of loading state and would make this
    // assertion pass unconditionally if used instead.
    expect(container.querySelector('.animate-pulse')).toBeTruthy();
    expect(screen.queryByText('Note A')).toBeNull();
    expect(screen.queryByText('Could not load your notes.')).toBeNull();

    release();
    await screen.findByText('Note A');
  });

  test('shows errors.load when the tree fails to load and nothing was ever loaded', async () => {
    findManyImpl = () => Promise.reject(new Error('db down'));

    const queryClient = makeQueryClient();
    render(<Harness queryClient={queryClient} />);

    expect(
      await screen.findByText('Could not load your notes.')
    ).toBeTruthy();
  });

  test('shows NoteEmpty when the tree loads with zero notes', async () => {
    findManyImpl = () => Promise.resolve([]);

    const queryClient = makeQueryClient();
    render(<Harness queryClient={queryClient} />);

    expect(await screen.findByText('No notes yet.')).toBeTruthy();
  });

  test('renders rows for a successful, non-empty tree', async () => {
    const queryClient = makeQueryClient();
    render(<Harness queryClient={queryClient} />);

    expect(await screen.findByText('Note A')).toBeTruthy();
  });

  test('disables the create button while a create is pending', async () => {
    const { release } = gateNextCreate();
    const queryClient = makeQueryClient();
    render(<Harness queryClient={queryClient} />);
    await screen.findByText('Note A');

    // No `@testing-library/jest-dom` matchers are registered in this
    // harness (checked: no other spec in the repo uses `toBeDisabled` or
    // `toBeInTheDocument`), so the `disabled` DOM property is read directly.
    const createButton = screen.getByRole(
      'button',
      { name: 'New note' }
    ) as HTMLButtonElement;
    expect(createButton.disabled).toBe(false);

    fireEvent.click(createButton);
    await waitFor(() => expect(createButton.disabled).toBe(true));

    release();
    await waitFor(() => expect(createButton.disabled).toBe(false));
  });

  test('shows an errors.create toast when create fails', async () => {
    const toastErrorSpy = spyOn(toast, 'error').mockImplementation(() => '');
    create.mockImplementationOnce(() =>
      Promise.reject(new Error('write failed'))
    );

    const queryClient = makeQueryClient();
    render(<Harness queryClient={queryClient} />);
    await screen.findByText('Note A');

    fireEvent.click(screen.getByRole('button', { name: 'New note' }));

    await waitFor(() => {
      expect(toastErrorSpy).toHaveBeenCalledWith(
        'Could not create the note.',
        expect.objectContaining({ description: 'write failed' })
      );
    });

    toastErrorSpy.mockRestore();
  });

  test('a failed background refetch does not replace an already-displayed tree with the error message (M6)', async () => {
    const queryClient = makeQueryClient();
    render(<Harness queryClient={queryClient} />);
    await screen.findByText('Note A');
    expect(findMany).toHaveBeenCalledTimes(1);

    // Simulate the exact background refetch the create mutation's own
    // invalidation triggers, but have IT fail — nothing about the tree
    // already on screen is wrong.
    findManyImpl = () => Promise.reject(new Error('transient'));
    await act(async () => {
      void queryClient.invalidateQueries({ queryKey: noteKeys.tree(false) });
    });

    await waitFor(() => expect(findMany).toHaveBeenCalledTimes(2));

    // The row must still be there, and the error paragraph must NOT have
    // replaced it — this is exactly what a plain `isError && (...)` gate
    // would get wrong, since TanStack still marks the query `isError` for
    // a failed background refetch even though `data` (and this row) is
    // untouched.
    expect(screen.getByText('Note A')).toBeTruthy();
    expect(screen.queryByText('Could not load your notes.')).toBeNull();
  });

  test('a failed background refetch does not replace a LEGITIMATELY EMPTY tree with the error message (M-b)', async () => {
    findManyImpl = () => Promise.resolve([]);
    const queryClient = makeQueryClient();
    render(<Harness queryClient={queryClient} />);
    await screen.findByText('No notes yet.');
    expect(findMany).toHaveBeenCalledTimes(1);

    // Same scenario as M6, but starting from zero notes rather than one —
    // exactly what a first-time author's create-triggered refetch looks
    // like. `tree.length === 0` here is legitimate, not a loading state,
    // so a gate keyed on it (an earlier version of this fix) cannot tell
    // this apart from "never successfully loaded" and would wrongly show
    // the load-error message instead of the create-a-note empty state.
    findManyImpl = () => Promise.reject(new Error('transient'));
    await act(async () => {
      void queryClient.invalidateQueries({ queryKey: noteKeys.tree(false) });
    });

    await waitFor(() => expect(findMany).toHaveBeenCalledTimes(2));

    expect(screen.getByText('No notes yet.')).toBeTruthy();
    expect(screen.queryByText('Could not load your notes.')).toBeNull();
  });

  test('a successful create also invalidates the search cache, not just the tree (M4)', async () => {
    const queryClient = makeQueryClient();
    // Seed a warm, fresh (not stale) empty-term search result — the shape
    // the palette's browse-when-empty view caches. `staleTime` alone would
    // keep this from refetching on its own for 60s; only an explicit
    // invalidation should be able to mark it stale early.
    queryClient.setQueryData(noteKeys.search('', 1), {
      data: [],
      meta: { currentPage: 1, totalPages: 0, totalCount: 0, hasMore: false },
    });
    expect(
      queryClient.getQueryState(noteKeys.search('', 1))?.isInvalidated
    ).toBe(false);

    render(<Harness queryClient={queryClient} />);
    await screen.findByText('Note A');

    fireEvent.click(screen.getByRole('button', { name: 'New note' }));

    await waitFor(() => {
      expect(
        queryClient.getQueryState(noteKeys.search('', 1))?.isInvalidated
      ).toBe(true);
    });
  });
});
