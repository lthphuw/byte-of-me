/**
 * `NoteTreePanel` uses no cmdk at all — plain TanStack queries plus a
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
 * happens to fail. Row count alone could not tell these two failures apart
 * from a genuine first-load failure; `isLoadingError` can.
 *
 * Since the tree started loading ONE LEVEL AT A TIME, the fake delegate below
 * serves both read shapes off one fake table: `getNoteTree`'s whole-corpus
 * `findMany` (no `parentId` in the `where`) and `getNoteChildren`'s per-level
 * one (`parentId` present, `null` meaning root). Counting calls per shape is
 * what lets these tests state the contract that actually matters now — a
 * collapsed folder must cost no query, an expanded one must cost exactly one,
 * and re-expanding must cost none.
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
      explorer: {
        viewMode: 'View',
        modes: { tree: 'Tree', flat: 'Flat list', grouped: 'Grouped' },
        sortLabel: 'Sort by',
        sort: { updated: 'Last edited', created: 'Date created', title: 'Title' },
        groupByLabel: 'Group by',
        groupBy: { status: 'Status', label: 'Label' },
        noLabel: 'No label',
        dropToRoot: 'Drop here to move to top level',
      },
      search: { trigger: 'Search notes' },
      actions: { create: 'New note', newFolder: 'New folder' },
      tree: { expandAriaLabel: 'Expand', collapseAriaLabel: 'Collapse' },
      empty: { title: 'No notes yet.' },
      archive: { empty: 'Nothing archived.' },
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
  createdAt: Date;
  status: string;
  isFolder: boolean;
  labels: { labelId: string }[];
  _count: { children: number };
}

const AT = new Date('2026-01-01T00:00:00.000Z');

function row(overrides: Partial<FakeNoteRow> & { id: string; title: string }): FakeNoteRow {
  return {
    parentId: null,
    position: 0,
    isPinned: false,
    archivedAt: null,
    updatedAt: AT,
    createdAt: AT,
    status: 'draft',
    isFolder: false,
    labels: [],
    _count: { children: 0 },
    ...overrides,
  };
}

const NOTE_A = row({ id: 'note-a', title: 'Note A' });
/** Root folder with one child — the `_count` is what draws its chevron. */
const FOLDER = row({
  id: 'folder-1',
  title: 'Folder One',
  isFolder: true,
  position: 1,
  _count: { children: 1 },
});
const CHILD = row({ id: 'child-1', title: 'Child One', parentId: 'folder-1' });

/** The fake table both read shapes below are served from. */
let table: FakeNoteRow[] = [];
/** `getNoteTree`'s whole-corpus read. */
let corpusImpl: () => Promise<FakeNoteRow[]>;
/** `getNoteChildren`'s per-level read. */
let levelImpl: (parentId: string | null) => Promise<FakeNoteRow[]>;

interface FindManyArgs {
  where: { parentId?: string | null };
}

const findMany = mock((args: FindManyArgs) =>
  'parentId' in args.where
    ? levelImpl(args.where.parentId ?? null)
    : corpusImpl()
);
const findFirst = mock(() => Promise.resolve(null));
const create = mock(
  (args: { data: Record<string, unknown> }) =>
    Promise.resolve({
      id: 'new-note-id',
      content: '',
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'draft',
      properties: null,
      isFolder: false,
      labels: [],
      ...args.data,
    })
);

Object.defineProperty(prisma, 'note', {
  value: { findMany, findFirst, create },
  writable: true,
  configurable: true,
});

/** How many times ONE level was read. `null` is the root level. */
function levelCalls(parentId: string | null): number {
  return findMany.mock.calls.filter(
    ([args]) => 'parentId' in args.where && (args.where.parentId ?? null) === parentId
  ).length;
}

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
  includeArchived = false,
}: {
  queryClient: QueryClient;
  onSelect?: (id: string) => void;
  includeArchived?: boolean;
}) {
  return (
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={messages}>
        <NoteTreePanel
          activeId={null}
          onSelect={onSelect}
          onOpenSearch={() => {}}
          includeArchived={includeArchived}
        />
      </NextIntlClientProvider>
    </QueryClientProvider>
  );
}

/** The `<li>` a row's title sits in — the row plus its children list. */
function rowOf(title: string): HTMLElement {
  const li = screen.getByText(title).closest('li');
  if (!li) throw new Error(`No tree row for "${title}"`);
  return li as HTMLElement;
}

/** A row's expand/collapse chevron, whichever label it currently carries. */
function chevronOf(title: string): HTMLButtonElement {
  const button = rowOf(title).querySelector(
    'button[aria-label="Expand"], button[aria-label="Collapse"]'
  );
  if (!button) throw new Error(`No chevron for "${title}"`);
  return button as HTMLButtonElement;
}

/** Resolves the NEXT read of one level only once `release()` runs — same
 *  technique as `note-editor.spec.tsx`'s `gateNextUpdateMany`. */
function gateLevel(parentId: string | null): { release: () => void } {
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const passthrough = levelImpl;
  levelImpl = async (requested) => {
    if (requested !== parentId) return passthrough(requested);
    await gate;
    return passthrough(requested);
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
      status: 'draft',
      properties: null,
      isFolder: false,
      labels: [],
      ...args.data,
    };
  });
  return { release };
}

beforeEach(() => {
  table = [NOTE_A, FOLDER, CHILD];
  corpusImpl = async () => table;
  levelImpl = async (parentId) =>
    table.filter((note) => note.parentId === parentId);
  findMany.mockClear();
  findFirst.mockClear().mockResolvedValue(null);
  create.mockClear();
});

afterEach(() => {
  cleanup();
});

describe('NoteTreePanel', () => {
  test('shows the skeleton while the root level is loading', async () => {
    const { release } = gateLevel(null);
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

  test('shows errors.load when the root level fails and nothing was ever loaded', async () => {
    levelImpl = () => Promise.reject(new Error('db down'));

    const queryClient = makeQueryClient();
    render(<Harness queryClient={queryClient} />);

    expect(
      await screen.findByText('Could not load your notes.')
    ).toBeTruthy();
  });

  test('shows NoteEmpty when the root level loads with zero notes', async () => {
    table = [];

    const queryClient = makeQueryClient();
    render(<Harness queryClient={queryClient} />);

    expect(await screen.findByText('No notes yet.')).toBeTruthy();
  });

  test('renders the root level only — a collapsed folder costs no query', async () => {
    const queryClient = makeQueryClient();
    render(<Harness queryClient={queryClient} />);
    await screen.findByText('Note A');
    await screen.findByText('Folder One');

    // The child exists in the fake table and is deliberately NOT on screen:
    // nothing has expanded its parent, so its level was never read. This is
    // the whole point of the change — the old panel fetched the corpus and
    // nested it client-side, so `Child One` would have been one level deep in
    // the DOM already.
    expect(screen.queryByText('Child One')).toBeNull();
    expect(levelCalls(null)).toBe(1);
    expect(levelCalls('folder-1')).toBe(0);
  });

  test('offers the chevron from childCount, before any child has been fetched', async () => {
    const queryClient = makeQueryClient();
    render(<Harness queryClient={queryClient} />);
    await screen.findByText('Folder One');

    // `aria-expanded` is set only on rows that HAVE children, so its presence
    // is the observable form of "this row offers an expand affordance".
    expect(chevronOf('Folder One').getAttribute('aria-expanded')).toBe('false');
    expect(chevronOf('Note A').getAttribute('aria-expanded')).toBeNull();
    // …and the folder's own level still has not been read to work that out.
    expect(levelCalls('folder-1')).toBe(0);
  });

  test('expanding a folder reads exactly that level; re-expanding reads none', async () => {
    const queryClient = makeQueryClient();
    render(<Harness queryClient={queryClient} />);
    await screen.findByText('Folder One');

    // Clicking a folder's title toggles it — folders have no document to open.
    fireEvent.click(screen.getByText('Folder One'));
    expect(await screen.findByText('Child One')).toBeTruthy();
    expect(levelCalls('folder-1')).toBe(1);
    expect(levelCalls('child-1')).toBe(0);

    fireEvent.click(screen.getByText('Folder One'));
    await waitFor(() => expect(screen.queryByText('Child One')).toBeNull());

    fireEvent.click(screen.getByText('Folder One'));
    expect(await screen.findByText('Child One')).toBeTruthy();
    // The level stayed in cache, so re-expanding is free.
    expect(levelCalls('folder-1')).toBe(1);
  });

  test('an expanding folder says it is loading instead of looking empty', async () => {
    const { release } = gateLevel('folder-1');
    const queryClient = makeQueryClient();
    render(<Harness queryClient={queryClient} />);
    await screen.findByText('Folder One');

    fireEvent.click(screen.getByText('Folder One'));

    // An empty <ul> here would read as "this folder is empty", which the
    // author cannot tell apart from the truth. `aria-busy` says otherwise.
    await waitFor(() => {
      expect(
        rowOf('Folder One').querySelector('ul')?.getAttribute('aria-busy')
      ).toBe('true');
    });
    expect(screen.queryByText('Child One')).toBeNull();

    release();
    expect(await screen.findByText('Child One')).toBeTruthy();
    expect(
      rowOf('Folder One').querySelector('ul')?.getAttribute('aria-busy')
    ).toBeNull();
  });

  test('a level that fails to load reports it inside the folder, not on the whole tree', async () => {
    const queryClient = makeQueryClient();
    render(<Harness queryClient={queryClient} />);
    await screen.findByText('Folder One');

    levelImpl = async (parentId) => {
      if (parentId === 'folder-1') throw new Error('level down');
      return table.filter((note) => note.parentId === parentId);
    };

    fireEvent.click(screen.getByText('Folder One'));

    const error = await screen.findByText('Could not load your notes.');
    // Scoped to the folder that failed — the root level loaded fine, so its
    // rows stay on screen rather than being replaced by the error.
    expect(rowOf('Folder One').contains(error)).toBe(true);
    expect(screen.getByText('Note A')).toBeTruthy();
  });

  test('the archived view still shows an archived note whose parent is still live', async () => {
    // Archiving cascades DOWN a subtree, so archiving a note that lived inside
    // a live folder leaves an archived row with a live parent. It belongs to no
    // `parentId: null` level, so a per-level read would lose it entirely —
    // which is why the trash keeps deriving its levels from the corpus.
    const liveFolder = row({
      id: 'live-folder',
      title: 'Live Folder',
      isFolder: true,
      _count: { children: 1 },
    });
    const archivedChild = row({
      id: 'archived-child',
      title: 'Archived Child',
      parentId: 'live-folder',
      archivedAt: AT,
    });
    table = [liveFolder, archivedChild];

    const queryClient = makeQueryClient();
    render(<Harness queryClient={queryClient} includeArchived />);

    expect(await screen.findByText('Archived Child')).toBeTruthy();
    // The live parent is not archived, so it must not appear in the trash.
    expect(screen.queryByText('Live Folder')).toBeNull();
    // And the archived tree asks for no levels at all.
    expect(levelCalls(null)).toBe(0);
    expect(levelCalls('live-folder')).toBe(0);
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
    expect(levelCalls(null)).toBe(1);

    // Simulate the exact background refetch a create's invalidation triggers,
    // but have IT fail — nothing about the tree already on screen is wrong.
    levelImpl = () => Promise.reject(new Error('transient'));
    await act(async () => {
      void queryClient.invalidateQueries({
        queryKey: noteKeys.children(null, false),
      });
    });

    await waitFor(() => expect(levelCalls(null)).toBe(2));

    // The row must still be there, and the error paragraph must NOT have
    // replaced it — this is exactly what a plain `isError && (...)` gate
    // would get wrong, since TanStack still marks the query `isError` for
    // a failed background refetch even though `data` (and this row) is
    // untouched.
    expect(screen.getByText('Note A')).toBeTruthy();
    expect(screen.queryByText('Could not load your notes.')).toBeNull();
  });

  test('a failed background refetch does not replace a LEGITIMATELY EMPTY tree with the error message (M-b)', async () => {
    table = [];
    const queryClient = makeQueryClient();
    render(<Harness queryClient={queryClient} />);
    await screen.findByText('No notes yet.');
    expect(levelCalls(null)).toBe(1);

    // Same scenario as M6, but starting from zero notes rather than one —
    // exactly what a first-time author's create-triggered refetch looks
    // like. Zero rows here is legitimate, not a loading state, so a gate
    // keyed on the row count (an earlier version of this fix) cannot tell
    // this apart from "never successfully loaded" and would wrongly show
    // the load-error message instead of the create-a-note empty state.
    levelImpl = () => Promise.reject(new Error('transient'));
    await act(async () => {
      void queryClient.invalidateQueries({
        queryKey: noteKeys.children(null, false),
      });
    });

    await waitFor(() => expect(levelCalls(null)).toBe(2));

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
