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
import { useState } from 'react';
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
      archiveConfirm: {
        title: 'Move “{title}” to the archive?',
        description: 'You can restore it from the Archived view.',
        descriptionWithChildren:
          '{count, plural, one {Its # nested note} other {Its # nested notes}} will go with it. You can restore them from the Archived view.',
        confirm: 'Move to archive',
        cancel: 'Cancel',
      },
      search: { trigger: 'Search notes' },
      actions: { create: 'New note', newFolder: 'New folder' },
      // `ExplorerDnd` reads this namespace unconditionally, for the
      // confirmation it shows when a drop would expose a note to a shared
      // folder. Without it every render here logs a MISSING_MESSAGE.
      move: {
        sharedTitle: 'Move into a shared folder?',
        sharedDescription:
          '“{title}” will become visible to {count, plural, one {# person} other {# people}} who can already open the destination.',
        sharedConfirm: 'Move anyway',
        sharedCancel: 'Cancel',
      },
      tree: {
        expandAriaLabel: 'Expand',
        collapseAriaLabel: 'Collapse',
        treeAriaLabel: 'Note tree',
        draftNoteLabel: 'New note name',
        draftFolderLabel: 'New folder name',
        renameInputLabel: 'Rename',
      },
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
/** `getArchivedNotes`' flat, newest-first read. */
let archivedImpl: () => Promise<FakeNoteRow[]>;
/** `getNotesPage`'s and `getNotesInGroup`'s documents-only reads. */
let documentsImpl: (args: FindManyArgs) => Promise<FakeNoteRow[]>;

interface FindManyArgs {
  where: {
    parentId?: string | null;
    archivedAt?: unknown;
    isFolder?: boolean;
    status?: string;
    labels?: { none?: object; some?: { labelId: string } };
  };
}

const findMany = mock((args: FindManyArgs) => {
  // The trash: `archivedAt: { not: null }`, and no parent filter at all —
  // an archived note can have a live parent, which is the whole reason it is
  // a flat read. Checked first because it is the only shape naming neither
  // `parentId` nor `isFolder`, and would otherwise fall through to the
  // whole-table branch and quietly return live notes as well.
  if (args.where.archivedAt != null) return archivedImpl();
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

/**
 * `getNoteAncestors`' recursive CTE — the ONE read that does not go through
 * `prisma.note`, which is why it needs its own stub. `RevealActiveNote` is the
 * caller: it turns this chain into expanded folders on the path to the open
 * note.
 */
const queryRaw = mock(() =>
  Promise.resolve([{ id: 'folder-1', title: 'Folder One', is_folder: true }])
);

/** `archiveNote`'s write — it stamps the target and its descendants. */
const updateMany = mock(() => Promise.resolve({ count: 1 }));

Object.defineProperty(prisma, 'note', {
  value: { findMany, findFirst, create, groupBy, count, updateMany },
  writable: true,
  configurable: true,
});
Object.defineProperty(prisma, '$queryRaw', {
  value: queryRaw,
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

/** How many times the WHOLE CORPUS was read — the cost this work removes.
 *  The trash's own read names neither `parentId` nor `isFolder` either, so it
 *  has to be excluded explicitly or it would be miscounted as a corpus read. */
function corpusCalls(): number {
  return findMany.mock.calls.filter(
    ([args]) =>
      !('parentId' in args.where) &&
      args.where.isFolder === undefined &&
      args.where.archivedAt == null
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
  activeId = null,
  initialRevealFolderId = null,
  onRemoved,
}: {
  queryClient: QueryClient;
  onSelect?: (id: string) => void;
  includeArchived?: boolean;
  /** The note open in the editor. Non-null is what arms the reveal path. */
  activeId?: string | null;
  /**
   * A breadcrumb click, as the editor delivers one. Held in STATE here, and
   * cleared by `onFolderRevealed`, because that pairing is the contract under
   * test — `NoteManager` owns exactly this state and exactly this reset.
   */
  initialRevealFolderId?: string | null;
  /** Told which note left the tree, so the widget can close the editor. */
  onRemoved?: (noteId: string) => void;
}) {
  const [revealFolderId, setRevealFolderId] = useState(initialRevealFolderId);

  return (
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={messages}>
        <NoteTreePanel
          activeId={activeId}
          onSelect={onSelect}
          onOpenSearch={() => {}}
          includeArchived={includeArchived}
          revealFolderId={revealFolderId}
          onFolderRevealed={() => setRevealFolderId(null)}
          onRemoved={onRemoved}
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

/**
 * Opens a draft row from the header button, types a name, and presses Enter —
 * the whole create gesture, which is now three steps rather than one click.
 *
 * `label` picks which draft: "New note name" or "New folder name".
 */
function commitDraft(label: string, title: string) {
  const trigger = label === 'New folder name' ? 'New folder' : 'New note';
  if (!screen.queryByLabelText(label)) {
    fireEvent.click(screen.getByRole('button', { name: trigger }));
  }
  const input = screen.getByLabelText(label);
  fireEvent.change(input, { target: { value: title } });
  fireEvent.keyDown(input, { key: 'Enter' });
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
  // Flat and newest-first, across every level — no parent filter at all.
  archivedImpl = async () =>
    table.filter((note) => note.archivedAt !== null);
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
  updateMany.mockClear().mockResolvedValue({ count: 1 });
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
    //
    // Read from the `treeitem`, not from the chevron button: the tree now
    // claims the full `role="tree"` pattern, and that pattern puts
    // `aria-expanded` on the item rather than on a control inside it. The
    // contract this test defends is unchanged — only the element carrying it
    // moved, and it moved to the one the ARIA spec names.
    expect(rowOf('Folder One').getAttribute('aria-expanded')).toBe('false');
    expect(rowOf('Note A').getAttribute('aria-expanded')).toBeNull();
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
    // which is why the trash is a FLAT `getArchivedNotes` list rather than a
    // tree. This is the invariant that decided that shape; if it ever fails,
    // the trash has started hiding things the author archived.
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

  test('the create button opens a draft row and writes nothing yet', async () => {
    const queryClient = makeQueryClient();
    render(<Harness queryClient={queryClient} />);
    await screen.findByText('Note A');

    fireEvent.click(screen.getByRole('button', { name: 'New note' }));

    // The row IS the naming step now. Nothing has been written: the previous
    // flow created an "Untitled" note immediately and left the author to rename
    // it, which is the round trip this replaces.
    expect(screen.getByLabelText('New note name')).toBeTruthy();
    expect(create).not.toHaveBeenCalled();
  });

  test('escaping a draft row leaves nothing behind', async () => {
    const queryClient = makeQueryClient();
    render(<Harness queryClient={queryClient} />);
    await screen.findByText('Note A');

    fireEvent.click(screen.getByRole('button', { name: 'New note' }));
    const input = screen.getByLabelText('New note name');
    fireEvent.change(input, { target: { value: 'Half typed' } });
    fireEvent.keyDown(input, { key: 'Escape' });

    await waitFor(() =>
      expect(screen.queryByLabelText('New note name')).toBeNull()
    );
    // The whole point of a draft: abandoning it costs the database nothing.
    expect(create).not.toHaveBeenCalled();
  });

  test('a committed draft is created already named, at the root', async () => {
    const queryClient = makeQueryClient();
    render(<Harness queryClient={queryClient} />);
    await screen.findByText('Note A');

    commitDraft('New note name', 'Sprint plan');

    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    const args = create.mock.calls[0]?.[0] as { data: Record<string, unknown> };
    expect(args.data.title).toBe('Sprint plan');
    expect(args.data.parentId).toBeNull();
    expect(args.data.isFolder).toBe(false);
  });

  test('a draft opened with a folder selected is created INSIDE that folder', async () => {
    const queryClient = makeQueryClient();
    render(<Harness queryClient={queryClient} />);
    await screen.findByText('Folder One');

    // Clicking a folder selects it (and expands it). That selection is what
    // decides where the next note is written — before this, both header
    // buttons wrote to the root unconditionally and every new note inside a
    // folder began with a drag.
    fireEvent.click(screen.getByText('Folder One'));
    fireEvent.click(screen.getByRole('button', { name: 'New note' }));
    commitDraft('New note name', 'Retro');

    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    const args = create.mock.calls[0]?.[0] as { data: Record<string, unknown> };
    expect(args.data.parentId).toBe('folder-1');
  });

  test('clicking a nested row selects THAT row, not the folder it sits in', async () => {
    const queryClient = makeQueryClient();
    render(<Harness queryClient={queryClient} />);
    await screen.findByText('Folder One');

    fireEvent.click(screen.getByText('Folder One'));
    expect(await screen.findByText('Child One')).toBeTruthy();

    fireEvent.click(screen.getByText('Child One'));

    // A child's `li` is nested inside its parent's, so a row click bubbles
    // through every ancestor row — and the outermost handler runs last and
    // wins. In the running app this looked like F2 renaming the top-level
    // folder after clicking a note three levels down.
    expect(rowOf('Child One').getAttribute('aria-selected')).toBe('true');
    expect(rowOf('Folder One').getAttribute('aria-selected')).toBe('false');
  });

  test('the tree opens onto the note the editor has open', async () => {
    const queryClient = makeQueryClient();
    render(<Harness queryClient={queryClient} activeId="child-1" />);

    // Nothing was clicked: the open note is three levels from anything on
    // screen, so `RevealActiveNote` resolves its ancestor chain and expands
    // the path to it. This is the behaviour the collapse test below must not
    // regress in the course of fixing it.
    expect(await screen.findByText('Child One')).toBeTruthy();
    expect(rowOf('Folder One').getAttribute('aria-expanded')).toBe('true');
  });

  test('collapsing the folder the open note lives in leaves it collapsed', async () => {
    const queryClient = makeQueryClient();
    render(<Harness queryClient={queryClient} activeId="child-1" />);
    await screen.findByText('Child One');

    fireEvent.click(chevronOf('Folder One'));

    // The bug this closes: "is the open note among the visible rows" was
    // recomputed every render and used as the reveal condition — and
    // collapsing this folder is exactly what makes it false. The reveal then
    // re-fired off a warm ancestor cache and re-opened the folder about
    // 100ms later, with the selection yanked back onto the note. Measured in
    // the browser with a MutationObserver on `aria-expanded` before the fix.
    //
    // `waitFor` on a NEGATIVE, deliberately: the re-expand was asynchronous,
    // so a single synchronous assertion here passed even while the bug was
    // live. This has to stay true through the commits that follow.
    await waitFor(() => {
      expect(rowOf('Folder One').getAttribute('aria-expanded')).toBe('false');
    });
    expect(screen.queryByText('Child One')).toBeNull();
  });

  test('a breadcrumb reveal opens the folder and then lets go of the selection', async () => {
    const queryClient = makeQueryClient();
    render(<Harness queryClient={queryClient} initialRevealFolderId="folder-1" />);

    // The reveal itself still has to work: the crumb's folder opens and
    // becomes the cursor, which is the whole point of clicking one.
    expect(await screen.findByText('Child One')).toBeTruthy();
    await waitFor(() => {
      expect(rowOf('Folder One').getAttribute('aria-selected')).toBe('true');
    });

    fireEvent.click(screen.getByText('Note A'));

    // The regression, and it is a RENDER LOOP rather than the cosmetic
    // snap-back it first looked like. `revealFolderId` was never cleared and
    // `onReveal` was an inline arrow, so `RevealActiveNote` stayed mounted
    // with a new callback identity every render — and it lists `onReveal` in
    // its effect's deps. That closes a cycle with `NoteTreeItem`, which calls
    // `explorer.clearReveal()` once it has scrolled the revealed row into
    // view: reveal sets `revealId`, the row clears it, clearing changes
    // `explorer`'s identity, the panel re-renders, the effect re-fires on a
    // fresh `onReveal`, and reveal sets `revealId` again. Running this exact
    // test against the pre-fix panel does not merely fail — React aborts with
    // "Maximum update depth exceeded", and the file times out.
    //
    // `waitFor` on the settled state, matching the collapse test above: the
    // cursor moves a render later either way, so a single synchronous
    // assertion here would pass even while the bug was live.
    await waitFor(() => {
      expect(rowOf('Note A').getAttribute('aria-selected')).toBe('true');
    });
    expect(rowOf('Folder One').getAttribute('aria-selected')).toBe('false');
  });

  test('Delete on a row reports the archived note, the way the row menu does', async () => {
    const queryClient = makeQueryClient();
    const onRemoved = mock((_noteId: string) => {});
    render(<Harness queryClient={queryClient} onRemoved={onRemoved} />);
    await screen.findByText('Note A');

    fireEvent.click(screen.getByText('Note A'));
    fireEvent.keyDown(rowOf('Note A'), { key: 'Delete' });

    // The confirmation is not optional — archiving cascades, so the keystroke
    // asks first (see `archiveTarget` in the panel).
    fireEvent.click(
      await screen.findByRole('button', { name: 'Move to archive' })
    );

    // The regression: this panel built its mutations with `useNoteMutations()`
    // and no `onRemoved`, while the row menus were handed one. Archiving the
    // OPEN note from the keyboard therefore left the editor mounted on a note
    // that had just left the tree — and still autosaving into it, since
    // `updateNote` does not refuse an archived row. Two ways to do one thing,
    // ending differently.
    await waitFor(() => {
      expect(onRemoved).toHaveBeenCalledWith('note-a');
    });
  });

  test('clicking the empty space below the rows clears the selection', async () => {
    const queryClient = makeQueryClient();
    render(<Harness queryClient={queryClient} />);
    await screen.findByText('Note A');

    fireEvent.click(screen.getByText('Note A'));
    expect(rowOf('Note A').getAttribute('aria-selected')).toBe('true');

    // The surface the rows sit on, which is also the only element a press on
    // the background can report as its target — see `ExplorerBlankMenu`.
    const surface = screen.getByRole('tree').parentElement;
    if (!surface) throw new Error('No explorer surface');
    fireEvent.mouseDown(surface);

    expect(rowOf('Note A').getAttribute('aria-selected')).toBe('false');
  });

  test('shows an errors.create toast when create fails', async () => {
    const toastErrorSpy = spyOn(toast, 'error').mockImplementation(() => '');
    create.mockImplementationOnce(() =>
      Promise.reject(new Error('write failed'))
    );

    const queryClient = makeQueryClient();
    render(<Harness queryClient={queryClient} />);
    await screen.findByText('Note A');

    commitDraft('New note name', 'Doomed');

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

    commitDraft('New note name', 'Fresh');

    await waitFor(() => {
      expect(
        queryClient.getQueryState(noteKeys.search('', 1))?.isInvalidated
      ).toBe(true);
    });
  });
});
