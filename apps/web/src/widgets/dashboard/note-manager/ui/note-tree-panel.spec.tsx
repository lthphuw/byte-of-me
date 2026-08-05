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
 * Since the explorer started loading BY CONTAINER, the fake delegate below
 * serves every read shape off one fake table, told apart by the `where` each
 * action builds: `getNoteTree`'s whole-corpus `findMany` (neither `parentId`
 * nor `isFolder`), `getNoteChildren`'s per-level one (`parentId` present,
 * `null` meaning root), and the documents-only reads behind the flat and
 * grouped views (`isFolder: false`, with a status/label filter in the grouped
 * case). Counting calls per shape is what lets these tests state the contract
 * that actually matters now — a collapsed folder or section must cost no
 * query, an expanded one exactly one, re-expanding none, and NO view outside
 * the archived trash may read the corpus at all.
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

/** The fake table every read shape below is served from. */
let table: FakeNoteRow[] = [];
/** `getNoteTree`'s whole-corpus read. */
let corpusImpl: () => Promise<FakeNoteRow[]>;
/** `getNoteChildren`'s per-level read. */
let levelImpl: (parentId: string | null) => Promise<FakeNoteRow[]>;
/** `getNotesPage`'s and `getNotesInGroup`'s documents-only reads. */
let documentsImpl: (args: FindManyArgs) => Promise<FakeNoteRow[]>;

interface FindManyArgs {
  where: {
    parentId?: string | null;
    isFolder?: boolean;
    status?: string;
    labels?: { none?: object; some?: { labelId: string } };
  };
}

const findMany = mock((args: FindManyArgs) => {
  if ('parentId' in args.where) return levelImpl(args.where.parentId ?? null);
  // The flat view and the grouped sections both list documents, never
  // containers, and both put that in the query rather than filtering the
  // result — which is exactly what makes the two shapes distinguishable here.
  if (args.where.isFolder === false) return documentsImpl(args);
  return corpusImpl();
});

/** `getNoteGroupSummaries`' status aggregate — counts, never rows. */
const groupBy = mock(() =>
  Promise.resolve([{ status: 'draft', _count: { _all: 0 } }])
);
/** The unlabeled bucket's size, counted through "has no join rows". */
const count = mock(() => Promise.resolve(0));
/** Serves `getNoteLabels` (id/name/color) and the label aggregate (`_count`)
 *  alike — one row shape wide enough for both `select`s. */
const labelFindMany = mock(() =>
  Promise.resolve(
    [] as { id: string; name: string; color: string | null; _count: { notes: number } }[]
  )
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
  value: { findMany, findFirst, create, groupBy, count },
  writable: true,
  configurable: true,
});
Object.defineProperty(prisma, 'noteLabel', {
  value: { findMany: labelFindMany },
  writable: true,
  configurable: true,
});

/** How many times ONE level was read. `null` is the root level. */
function levelCalls(parentId: string | null): number {
  return findMany.mock.calls.filter(
    ([args]) => 'parentId' in args.where && (args.where.parentId ?? null) === parentId
  ).length;
}

/** How many times the WHOLE CORPUS was read — the cost this work removes. */
function corpusCalls(): number {
  return findMany.mock.calls.filter(
    ([args]) => !('parentId' in args.where) && args.where.isFolder === undefined
  ).length;
}

/** How many times one grouped bucket's rows were read. */
function groupRowCalls(match: (where: FindManyArgs['where']) => boolean): number {
  return findMany.mock.calls.filter(
    ([args]) => args.where.isFolder === false && match(args.where)
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

/** A grouped-view section header, found by the bucket title it shows. */
function sectionHeader(title: string): HTMLButtonElement {
  const button = screen.getByText(title).closest('button');
  if (!button) throw new Error(`No grouped section header for "${title}"`);
  return button as HTMLButtonElement;
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

/**
 * Puts the explorer in a non-default view. `useExplorerPrefs` reads this in an
 * effect (never at init — the first render has to match the server HTML), so
 * the panel always paints the tree for one frame and then snaps to this.
 */
function selectView(prefs: {
  mode: 'tree' | 'flat' | 'grouped';
  sort?: 'updated' | 'created' | 'title';
  groupBy?: 'status' | 'label';
}) {
  window.localStorage.setItem(
    'byte-of-me:notes-explorer',
    JSON.stringify({ sort: 'updated', groupBy: 'status', ...prefs })
  );
}

beforeEach(() => {
  table = [NOTE_A, FOLDER, CHILD];
  corpusImpl = async () => table;
  levelImpl = async (parentId) =>
    table.filter((note) => note.parentId === parentId);
  documentsImpl = async (args) => {
    const documents = table.filter(
      (note) => !note.isFolder && note.archivedAt === null
    );
    const { status, labels } = args.where;
    if (typeof status === 'string') {
      return documents.filter((note) => note.status === status);
    }
    if (labels?.none) return documents.filter((note) => note.labels.length === 0);
    const someLabelId = labels?.some?.labelId;
    if (someLabelId) {
      return documents.filter((note) =>
        note.labels.some((join) => join.labelId === someLabelId)
      );
    }
    return documents;
  };
  window.localStorage.clear();
  findMany.mockClear();
  findFirst.mockClear().mockResolvedValue(null);
  create.mockClear();
  groupBy.mockClear().mockResolvedValue([{ status: 'draft', _count: { _all: 0 } }]);
  count.mockClear().mockResolvedValue(0);
  labelFindMany.mockClear().mockResolvedValue([]);
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
    // …and the corpus read the panel used to pay for on every dashboard load
    // does not happen at all outside the archived view. This single number is
    // what the whole by-container refactor exists to make zero.
    expect(corpusCalls()).toBe(0);
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

  test('the flat view lists paginated documents across the hierarchy, never the corpus', async () => {
    selectView({ mode: 'flat' });
    const queryClient = makeQueryClient();
    render(<Harness queryClient={queryClient} />);

    // `Child One` sits under a folder nobody expanded: the flat view spans the
    // whole hierarchy, so `getNotesPage` returns it without any level being
    // read. Waiting on IT rather than on `Note A` is deliberate — `Note A` is
    // also a root row, so it is on screen during the one tree frame
    // `useExplorerPrefs` paints before localStorage is read.
    expect(await screen.findByText('Child One')).toBeTruthy();
    // Folders are structure, not documents, and the server drops them.
    expect(screen.queryByText('Folder One')).toBeNull();
    expect(corpusCalls()).toBe(0);
  });

  test('the flat view offers the create-a-note empty state when there are no documents', async () => {
    // A container and nothing to read inside it: the tree is NOT empty here,
    // so an empty state on screen can only have come from the flat view.
    table = [FOLDER];
    selectView({ mode: 'flat' });
    const queryClient = makeQueryClient();
    render(<Harness queryClient={queryClient} />);

    expect(await screen.findByText('No notes yet.')).toBeTruthy();
  });

  test('a flat-view failure says so instead of looking like an empty list', async () => {
    documentsImpl = () => Promise.reject(new Error('page down'));
    selectView({ mode: 'flat' });
    const queryClient = makeQueryClient();
    render(<Harness queryClient={queryClient} />);

    expect(await screen.findByText('Could not load your notes.')).toBeTruthy();
    expect(screen.queryByText('No notes yet.')).toBeNull();
  });

  test('a grouped section header shows the aggregate count, not the rows it loaded', async () => {
    // Two draft documents are loadable; the bucket actually holds seven.
    groupBy.mockResolvedValue([{ status: 'draft', _count: { _all: 7 } }]);
    selectView({ mode: 'grouped', groupBy: 'status' });
    const queryClient = makeQueryClient();
    render(<Harness queryClient={queryClient} />);

    expect(await screen.findByText('Child One')).toBeTruthy();
    // Sections paginate, so a count taken off the loaded rows would both
    // understate the bucket and keep climbing as the reader scrolled — the
    // reason the summaries are a separate aggregate query at all.
    expect(screen.getByText('7')).toBeTruthy();
    expect(corpusCalls()).toBe(0);
  });

  test('collapsing a grouped section stops its row query; re-expanding costs none', async () => {
    groupBy.mockResolvedValue([{ status: 'draft', _count: { _all: 2 } }]);
    selectView({ mode: 'grouped', groupBy: 'status' });
    const queryClient = makeQueryClient();
    render(<Harness queryClient={queryClient} />);
    await screen.findByText('Child One');

    const isDraftBucket = (where: FindManyArgs['where']) =>
      where.status === 'draft';
    expect(groupRowCalls(isDraftBucket)).toBe(1);

    fireEvent.click(sectionHeader('draft'));
    await waitFor(() => expect(screen.queryByText('Child One')).toBeNull());

    fireEvent.click(sectionHeader('draft'));
    expect(await screen.findByText('Child One')).toBeTruthy();
    // The bucket's page stayed in cache, so unfolding is free.
    expect(groupRowCalls(isDraftBucket)).toBe(1);
  });

  test('the unlabeled bucket header is localized, not the raw key token', async () => {
    labelFindMany.mockResolvedValue([
      { id: 'label-1', name: 'Ideas', color: null, _count: { notes: 1 } },
    ]);
    count.mockResolvedValue(4);
    selectView({ mode: 'grouped', groupBy: 'label' });
    const queryClient = makeQueryClient();
    render(<Harness queryClient={queryClient} />);

    // `getNoteGroupSummaries` returns the key token `no-label` as that
    // bucket's title on purpose — a server action has no locale to translate
    // into — so this header is the one place that can turn it into prose.
    expect(await screen.findByText('No label')).toBeTruthy();
    expect(screen.queryByText('no-label')).toBeNull();
    expect(screen.getByText('Ideas')).toBeTruthy();
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
