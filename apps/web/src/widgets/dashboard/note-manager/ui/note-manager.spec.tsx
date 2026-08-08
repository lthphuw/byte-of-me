/**
 * `NoteManager` composes the tree, the editor and the search palette. Its own
 * contracts: the Cmd/Ctrl+K shortcut actually opens the palette (M5 rewrote
 * how that listener decides when to act), and choosing a note *navigates* —
 * selection is the route now, not component state, because a `[[` link in a
 * document points at `/space/notes/<id>` and has to resolve to a real page.
 *
 * `@/shared/i18n/navigation` is stubbed globally in `next-runtime-stubs.ts`;
 * `__navigations` is that stub's record of every route a component asked for.
 */
import { prisma } from '@byte-of-me/db';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { NextIntlClientProvider } from 'next-intl';

import { NoteManager } from './note-manager';

import * as navigation from '@/shared/i18n/navigation';

// The real module's types know nothing about the stub's test helpers, which
// is correct — they exist only under `bun test`. See the stub plugin.
const { __navigations, __resetNavigation } = navigation as unknown as {
  __navigations: string[];
  __resetNavigation: (pathname?: string) => void;
};

const messages = {
  dashboard: {
    note: {
      untitled: 'Untitled',
      loading: 'Loading note…',
      emptySelection: 'Select a note, or create one.',
      backToList: 'All notes',
      tree: {
        expandAriaLabel: 'Expand',
        collapseAriaLabel: 'Collapse',
        actionsAriaLabel: 'Note actions',
      },
      fields: { title: 'Note title', titlePlaceholder: 'Untitled' },
      actions: {
        create: 'New note',
        archive: 'Archive',
        restore: 'Restore',
        delete: 'Delete',
        deleteForever: 'Delete permanently',
        share: 'Share',
        showArchived: 'Archived',
        hideArchived: 'Back to notes',
      },
      // Read unconditionally by ExplorerDnd and ShareNoteDialog respectively.
      move: {
        sharedTitle: 'Move into a shared folder?',
        sharedDescription:
          '“{title}” will become visible to {count, plural, one {# person} other {# people}} who can already open the destination.',
        sharedConfirm: 'Move anyway',
        sharedCancel: 'Cancel',
      },
      share: {
        title: 'Share “{title}”',
        descriptionNote:
          'People you invite can open this note only. Nothing else in your space becomes visible to them.',
        descriptionFolder:
          'People you invite can open this folder and everything inside it — including notes you move in later.',
        emailLabel: 'Email address',
        emailPlaceholder: 'name@example.com',
        roleViewer: 'Can view',
        roleEditor: 'Can edit',
        invite: 'Invite',
        pending: 'Pending',
        accepted: 'Accepted',
        revoke: 'Remove access',
        empty: 'Not shared with anyone yet.',
        loading: 'Loading people…',
        failed: 'Could not load who has access.',
      },
      status: {
        saving: 'Saving…',
        saved: 'Saved',
        error: 'Not saved',
        retry: 'Retry',
      },
      search: {
        trigger: 'Search notes',
        placeholder: 'Search your notes…',
        loading: 'Searching…',
        empty: 'No notes match.',
      },
      archive: { title: 'Archived', empty: 'Nothing archived.' },
      sidebar: {
        title: 'Note panel',
        toc: 'Contents',
        links: 'Links',
        tocEmpty: 'Headings you add will show up here.',
      },
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
      links: {
        title: 'Links',
        outgoing: 'Links out',
        incoming: 'Mentioned by',
        empty: 'No links yet.',
        open: 'Show links',
        close: 'Hide links',
        deleted: 'Deleted note',
        expandAriaLabel: 'Expand links',
        collapseAriaLabel: 'Collapse links',
        insert: 'Link to note',
        pickerPlaceholder: 'Link to a note…',
        pickerEmpty: 'No notes match.',
        pickerCreate: 'Create note “{title}”',
      },
      delete: {
        title: 'Delete permanently?',
        description: '“{title}” will be deleted for good. This cannot be undone.',
        descriptionWithChildren:
          '“{title}” and {count, plural, one {its # nested note} other {its # nested notes}} will be deleted for good. This cannot be undone.',
        descriptionShared:
          '{count, plural, one {# person} other {# people}} can currently open this. Deleting it removes their access too.',
        confirm: 'Delete permanently',
        cancel: 'Cancel',
      },
      toasts: {
        archived: 'Moved to archive',
        restored: 'Note restored',
        deleted: 'Note deleted',
      },
      empty: { title: 'No notes yet.' },
      errors: {
        load: 'Could not load your notes.',
        create: 'Could not create the note.',
        save: 'Could not save the note.',
        archive: 'Could not archive the note.',
        restore: 'Could not restore the note.',
        delete: 'Could not delete the note.',
      },
    },
  },
} as const;

interface FakeNoteTreeRow {
  id: string;
  title: string;
  parentId: string | null;
  position: number;
  isPinned: boolean;
  archivedAt: Date | null;
  updatedAt: Date;
  status: string;
  isFolder: boolean;
  labels: { labelId: string }[];
}

interface FakeNoteDetail extends Omit<FakeNoteTreeRow, 'labels'> {
  content: string;
  createdAt: Date;
  properties: Record<string, unknown> | null;
  // Detail rows join through to the label itself, unlike tree rows.
  labels: { label: { id: string; name: string; color: string | null } }[];
}

function doc(text: string): string {
  return JSON.stringify({
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
  });
}

const NOTE_A: FakeNoteDetail = {
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

const notesById = new Map<string, FakeNoteDetail>([[NOTE_A.id, NOTE_A]]);

/**
 * How many notes hang under `FOLDER_F`, transitively.
 *
 * Deliberately NOT represented as rows anywhere in this file: the folder stays
 * collapsed for the whole suite, so its children are never fetched and the
 * browser has nothing to count. That is the post-pagination state the delete
 * confirmation has to keep working in — see the collapsed-folder test below.
 */
const FOLDER_DESCENDANTS = 3;

/** A root-level row the tree renders and never expands. */
const FOLDER_F = {
  id: 'folder-f',
  title: 'Folder F',
  parentId: null,
  position: 1,
  isPinned: false,
  archivedAt: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  status: 'draft',
  isFolder: true,
  labels: [],
  _count: { children: FOLDER_DESCENDANTS },
};

// One level of the tree, as `getNoteChildren` reads it. The mock ignores
// `where`, so every level would return the same rows — which is fine here
// precisely because nothing in this suite ever expands anything, and the
// recorded `args` are what the collapsed-folder test asserts on.
const findMany = mock((_args?: { where?: { parentId?: string | null } }) =>
  Promise.resolve([
    ...Array.from(notesById.values()).map(
      ({ id, title, parentId, position, isPinned, archivedAt, updatedAt, createdAt, status, isFolder }) => ({
        id,
        title,
        parentId,
        position,
        isPinned,
        archivedAt,
        updatedAt,
        createdAt,
        status,
        isFolder,
        labels: [],
        _count: { children: 0 },
      })
    ),
    FOLDER_F,
  ])
);
const count = mock(() => Promise.resolve(0));
const findFirst = mock(() => Promise.resolve(null));
const create = mock(() => Promise.reject(new Error('not exercised')));
const findFirstOrThrow = mock((args: { where: { id: string } }) => {
  const row = notesById.get(args.where.id);
  if (!row) return Promise.reject(new Error('Note not found'));
  return Promise.resolve({ ...row });
});
const updateMany = mock(() => Promise.resolve({ count: 1 }));

Object.defineProperty(prisma, 'note', {
  value: { findMany, count, findFirst, create, findFirstOrThrow, updateMany },
  writable: true,
  configurable: true,
});

// `getDescendantCount` is a recursive CTE, so it goes through `$queryRaw`
// rather than the `note` delegate — replaced wholesale for the same reason
// (Prisma 7 synthesizes a fresh function on every access, so `spyOn` is
// bypassed; AGENTS §10). `$queryRaw` is a tagged template, so the note id
// arrives as the first interpolated value; answering per-id is what lets the
// two menus below assert different counts.
const descendantCounts = new Map<string, number>([
  [FOLDER_F.id, FOLDER_DESCENDANTS],
]);
// TWO actions now share `$queryRaw` — `getDescendantCount` and
// `getNoteAncestors` — so the mock has to tell them apart by the SQL it is
// handed. Answering both with the count shape fed the editor's breadcrumb a
// list of rows with no `id`, which React reported as a missing-key warning
// from `BreadcrumbList`: a real signal that this mock had quietly become
// ambiguous, not noise to silence.
const queryRaw = mock((sql: TemplateStringsArray, noteId?: string) => {
  const text = sql.join('');
  if (text.includes('ancestors')) {
    // No breadcrumb in these tests: every fixture note is at the root.
    return Promise.resolve([]);
  }
  return Promise.resolve([{ count: descendantCounts.get(noteId ?? '') ?? 0 }]);
});
Object.defineProperty(prisma, '$queryRaw', {
  value: queryRaw,
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
  noteId = null,
}: {
  queryClient: QueryClient;
  noteId?: string | null;
}) {
  return (
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={messages}>
        <NoteManager noteId={noteId} />
      </NextIntlClientProvider>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  findMany.mockClear();
  findFirstOrThrow.mockClear();
  updateMany.mockClear();
  queryRaw.mockClear();
  __resetNavigation('/space/notes');
});

afterEach(() => {
  cleanup();
});

describe('NoteManager', () => {
  test('shows the empty-selection copy until a note is chosen', async () => {
    const queryClient = makeQueryClient();
    render(<Harness queryClient={queryClient} />);

    expect(
      await screen.findByText('Select a note, or create one.')
    ).toBeTruthy();
  });

  test('Cmd/Ctrl+K opens the search palette', async () => {
    const queryClient = makeQueryClient();
    render(<Harness queryClient={queryClient} />);
    await screen.findByText('Select a note, or create one.');

    // Not present while closed: radix `Dialog` unmounts its content.
    expect(screen.queryByPlaceholderText('Search your notes…')).toBeNull();

    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });

    expect(
      await screen.findByPlaceholderText('Search your notes…')
    ).toBeTruthy();
  });

  test('selecting a tree row navigates to that note’s route', async () => {
    const queryClient = makeQueryClient();
    render(<Harness queryClient={queryClient} />);
    await screen.findByText('Select a note, or create one.');

    fireEvent.click(await screen.findByText('Note A'));

    // The URL still has to change — a `[[` link points at
    // `/space/notes/<id>`, reloads must reopen the note, and Back has to
    // work. What changed in P1 is only that the widget no longer *waits*
    // for the push to come back before showing the note (next test).
    await waitFor(() =>
      expect(__navigations).toEqual(['/space/notes/note-a'])
    );
  });

  test('renders the editor for the note the route names', async () => {
    const queryClient = makeQueryClient();
    render(<Harness queryClient={queryClient} noteId="note-a" />);

    expect(await screen.findByDisplayValue('Note A')).toBeTruthy();
    expect(screen.queryByText('Select a note, or create one.')).toBeNull();
  });

  // P1: selection used to be *only* the route, so every click paid a full
  // server round-trip before anything moved — measured at ~990ms to the URL
  // change and ~2s to content on a local dev server, because
  // `(protected)/layout.tsx` is `force-dynamic` and the `[id]` page runs a
  // `getNoteTitle` query for its `generateMetadata`. The route is still the
  // source of truth; it is just no longer on the critical path for drawing
  // the note the author just clicked.
  test('opens the chosen note immediately, without waiting for the route', async () => {
    const queryClient = makeQueryClient();
    render(<Harness queryClient={queryClient} />);
    await screen.findByText('Select a note, or create one.');

    fireEvent.click(await screen.findByText('Note A'));

    // `noteId` is deliberately never re-passed: this asserts the editor
    // mounts off the optimistic selection alone.
    expect(await screen.findByDisplayValue('Note A')).toBeTruthy();
  });

  // The other half of that contract: an optimistic selection must not
  // outlive the route it was guessing at. Back/forward, and the
  // `router.replace` the actions menu fires after deleting the open note,
  // both arrive as nothing but a changed `noteId` prop.
  test('follows the route when it changes underneath the optimistic pick', async () => {
    const queryClient = makeQueryClient();
    const { rerender } = render(
      <Harness queryClient={queryClient} noteId="note-a" />
    );
    await screen.findByDisplayValue('Note A');

    rerender(<Harness queryClient={queryClient} noteId={null} />);

    expect(
      await screen.findByText('Select a note, or create one.')
    ).toBeTruthy();
  });

  // M5: `event.key === 'k'` (a strict literal) silently missed `'K'` —
  // Shift held or CapsLock on.
  test('Shift+K (a capital "K") also opens the search palette', async () => {
    const queryClient = makeQueryClient();
    render(<Harness queryClient={queryClient} />);
    await screen.findByText('Select a note, or create one.');

    fireEvent.keyDown(document, { key: 'K', ctrlKey: true, shiftKey: true });

    expect(
      await screen.findByPlaceholderText('Search your notes…')
    ).toBeTruthy();
  });

  // M5: swallowing Ctrl+K unconditionally broke the native "kill to end of
  // line" binding some browsers (notably macOS) honour inside a text field.
  //
  // Asserts on a boolean (`=== null`), not directly on the query's return
  // value: `expect(node).toBeNull()`, when `node` is NOT actually null (the
  // shape a broken guard produces, on the red side of this test), makes bun
  // pretty-print the live `HTMLInputElement` — including its React fiber,
  // a self-referential object graph — as part of the failure message. M-a
  // in review round 3 measured that at ~190s and ~7,000,000 lines for THIS
  // specific test; the assertion still terminates with a real failure, but
  // nothing about that is readable, and in CI it reads as a hung suite.
  test('Ctrl+K inside the note title input does not open the palette', async () => {
    const queryClient = makeQueryClient();
    render(<Harness queryClient={queryClient} noteId="note-a" />);
    const titleInput = await screen.findByDisplayValue('Note A');

    fireEvent.keyDown(titleInput, { key: 'k', ctrlKey: true });

    const palette = screen.queryByPlaceholderText('Search your notes…');
    expect(palette === null).toBe(true);
  });

  // N1: the previous fix (M5) scoped the editable-target bail to BOTH
  // modifiers, which made Cmd+K dead inside the title input and the
  // rich-text body — the one place focus sits for essentially the whole
  // time a note is open. Cmd+K has no native text-field binding to yield
  // to (unlike Ctrl+K's "kill to end of line"), so it must keep working
  // there. The existing editable-target test above uses `ctrlKey`, which
  // is exactly why this regression was invisible until now.
  test('Cmd+K inside the note title input still opens the palette', async () => {
    const queryClient = makeQueryClient();
    render(<Harness queryClient={queryClient} noteId="note-a" />);
    const titleInput = await screen.findByDisplayValue('Note A');

    fireEvent.keyDown(titleInput, { key: 'k', metaKey: true });

    expect(
      await screen.findByPlaceholderText('Search your notes…')
    ).toBeTruthy();
  });

  // The whole reason this widget stopped reading the corpus. `FOLDER_F` is
  // never expanded, so its three descendants exist NOWHERE in the browser —
  // the `collectDescendantIds` walk this replaces could only ever have
  // answered 0 — and the confirmation still has to name them, because the
  // database cascade takes them either way.
  test('counts a collapsed folder’s subtree for the delete confirmation', async () => {
    const queryClient = makeQueryClient();
    render(<Harness queryClient={queryClient} />);

    const folderRow = (await screen.findByText('Folder F')).closest('div');
    expect(folderRow === null).toBe(false);

    // `pointerdown`, not `click`: radix opens a dropdown on pointer-down, and
    // that is deliberately the same event the widget arms the count query on
    // — so a row whose menu is never opened never costs a request, which is
    // what makes a per-row count affordable at all.
    fireEvent.pointerDown(
      within(folderRow as HTMLElement).getByLabelText('Note actions'),
      { button: 0, ctrlKey: false }
    );
    fireEvent.click(
      await screen.findByRole('menuitem', { name: 'Delete permanently' })
    );

    expect(
      await screen.findByText(/and its 3 nested notes will be deleted/)
    ).toBeTruthy();

    // ...and it got there without the folder's level ever being read: no
    // query asked for `parentId: 'folder-f'`. If that ever stops holding, the
    // test is passing for the pre-pagination reason.
    const levelsRead = findMany.mock.calls.map(
      ([args]) => args?.where?.parentId
    );
    expect(levelsRead).not.toContain(FOLDER_F.id);
  });

  // The open note's header menu used to find its title, pinned and archived
  // state by scanning that same corpus for the one row matching the route.
  // They all live on `NoteDetail`, which the editor mounted directly below
  // fetches anyway — so the same key serves both and nothing extra is paid.
  test('the open note’s actions menu reads its facts from the note detail', async () => {
    const queryClient = makeQueryClient();
    render(<Harness queryClient={queryClient} noteId="note-a" />);
    await screen.findByDisplayValue('Note A');

    // The editor's own header menu, not one of the tree's: the tree lives in
    // the sibling `<aside>`.
    fireEvent.pointerDown(
      within(screen.getByRole('main')).getByLabelText('Note actions'),
      { button: 0, ctrlKey: false }
    );
    fireEvent.click(
      await screen.findByRole('menuitem', { name: 'Delete permanently' })
    );

    // The title comes from the detail row, and a leaf gets the uncounted
    // copy — the count is per-note, not a single number reused everywhere.
    expect(
      await screen.findByText(/“Note A” will be deleted for good/)
    ).toBeTruthy();
  });
});
