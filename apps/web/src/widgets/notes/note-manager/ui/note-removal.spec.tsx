/**
 * A note being taken away from under the open editor.
 *
 * Two failures with the same shape, both reproduced here against the real
 * widget — real mutations, real server actions, a faked `prisma` delegate —
 * because both live in the seam BETWEEN the pieces and neither is visible
 * from inside any one of them:
 *
 *  - deleting the open note mid-edit unmounted the editor, whose departure
 *    flush then sent an `updateNote` at the row the delete had just removed.
 *    The author read "Note deleted" and then, a beat later, a red
 *    "Could not save the note." for the same note.
 *  - archiving a FOLDER cascades to its subtree, but only the clicked id was
 *    reported back — so an editor open on a descendant kept the note on
 *    screen and the URL, still autosaving into a row that had gone to the
 *    trash.
 *
 * `note-manager.spec.tsx` covers this widget's own contracts (selection,
 * shortcuts, the delete confirmation's count). This file is kept separate
 * because its fixtures are a two-level corpus and its mutations really run.
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
  within,
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

import { NoteManager } from './note-manager';

import * as navigation from '@/shared/i18n/navigation';

const { __navigations, __resetNavigation } = navigation as unknown as {
  __navigations: string[];
  __resetNavigation: (pathname?: string) => void;
};

// A hand-written subset of `messages/en.json`'s `dashboard.note`, for the
// reason `note-editor.spec.tsx` states: this file lives outside `src/`, and
// every key the rendered tree ASKS for has to be present or the run fills
// with `MISSING_MESSAGE` traces that bury the real assertion.
const messages = {
  dashboard: {
    note: {
      title: 'Notes',
      untitled: 'Untitled',
      untitledFolder: 'New folder',
      loading: 'Loading note…',
      emptySelection: 'Select a note, or create one.',
      backToList: 'All notes',
      folderNotEditable: 'This is a folder — it has no document to edit.',
      tree: {
        treeAriaLabel: 'Note tree',
        expandAriaLabel: 'Expand',
        collapseAriaLabel: 'Collapse',
        actionsAriaLabel: 'Note actions',
      },
      fields: { title: 'Note title', titlePlaceholder: 'Untitled' },
      actions: {
        create: 'New note',
        newFolder: 'New folder',
        newNoteInside: 'New note inside',
        newFolderInside: 'New folder inside',
        rename: 'Rename',
        pin: 'Pin',
        unpin: 'Unpin',
        archive: 'Archive',
        restore: 'Restore',
        delete: 'Delete',
        deleteForever: 'Delete permanently',
        share: 'Share',
        showArchived: 'Archived',
        hideArchived: 'Back to notes',
      },
      archiveConfirm: {
        title: 'Move “{title}” to the archive?',
        description: 'You can restore it from the Archived view.',
        descriptionWithChildren:
          '{count, plural, one {Its # nested note} other {Its # nested notes}} will go with it. You can restore them from the Archived view.',
        confirm: 'Move to archive',
        cancel: 'Cancel',
      },
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
      view: { label: 'Editor view', editor: 'Editor', markdown: 'Markdown' },
      cheatSheet: {
        open: 'Markdown help',
        title: 'Markdown cheat sheet',
        description:
          'Type these as you write — they turn into formatting instantly.',
        noSyntax: 'Drag & drop / paste',
        sections: {
          basics: 'Basics',
          blocks: 'Blocks',
          linksMedia: 'Links & media',
          tables: 'Tables',
          math: 'Math',
        },
        rows: {
          heading: 'Heading — one # per level, then a space.',
          bold: 'Bold text.',
          italic: 'Italic text.',
          strike: 'Strikethrough.',
          code: 'Inline code.',
          quote: 'Blockquote — type > then a space.',
          list: 'Bulleted or numbered list.',
          fence: 'Code block — three backticks, optional language.',
          rule: 'Horizontal divider.',
          noteLink: 'Link to another note — type [[ and pick one.',
          image: 'Drop an image file or paste a screenshot to insert it.',
          table: 'Paste a markdown table and it becomes a real table.',
          mathInline: 'Inline math, rendered as you type.',
          mathBlock: 'Math block on its own line, in display style.',
        },
      },
      markdown: {
        format: 'Clean up markdown',
        formatted: 'Markdown tidied up.',
        alreadyClean: 'Markdown is already tidy.',
      },
      export: {
        label: 'Export',
        markdown: 'Download .md',
        pdf: 'Print / Save as PDF',
        notReady: 'The note is still loading.',
      },
      properties: {
        title: 'Properties',
        status: 'Status',
        statusPlaceholder: 'e.g. draft',
        labels: 'Labels',
        removeLabel: 'Remove label {name}',
        key: 'Property name',
        value: 'Property value',
        add: 'Add property',
        remove: 'Remove {key}',
        presets: { draft: 'Draft', active: 'Active', done: 'Done' },
      },
      search: {
        trigger: 'Search notes',
        placeholder: 'Search your notes…',
        loading: 'Searching…',
        empty: 'No notes match.',
        actionsHeading: 'Actions',
        actionNewNote: 'New note',
        actionCheatSheet: 'Markdown help',
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
        sort: {
          updated: 'Last edited',
          created: 'Date created',
          title: 'Title',
        },
        groupByLabel: 'Group by',
        groupBy: { status: 'Status', label: 'Label' },
        noLabel: 'No label',
        dropToRoot: 'Drop here to move to top level',
        resizeAriaLabel: 'Resize the note list',
        expandSidebar: 'Show note list',
        breadcrumbAriaLabel: 'Note location',
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
        description:
          '“{title}” will be deleted for good. This cannot be undone.',
        descriptionWithChildren:
          '“{title}” and {count, plural, one {its # nested note} other {its # nested notes}} will be deleted for good. This cannot be undone.',
        descriptionShared:
          '{count, plural, one {# person} other {# people}} can currently open this. Deleting it removes their access too.',
        impactUnknown:
          'Could not check what this affects. It may take nested notes with it, and other people may lose access.',
        confirm: 'Delete permanently',
        cancel: 'Cancel',
      },
      toasts: {
        archived: 'Moved to archive',
        restored: 'Note restored',
        deleted: 'Note deleted',
      },
      sync: {
        recovered:
          '{count, plural, one {Recovered # unsaved note} other {Recovered # unsaved notes}}',
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

interface FakeNote {
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
  properties: Record<string, unknown> | null;
  isFolder: boolean;
}

function doc(text: string): string {
  return JSON.stringify({
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
  });
}

const AT = new Date('2026-01-01T00:00:00.000Z');

function makeNote(
  over: Partial<FakeNote> & { id: string; title: string }
): FakeNote {
  return {
    content: doc(over.title),
    parentId: null,
    position: 0,
    isPinned: false,
    archivedAt: null,
    createdAt: AT,
    updatedAt: AT,
    status: 'draft',
    properties: null,
    isFolder: false,
    ...over,
  };
}

/** Root note, folder, and the note INSIDE the folder — the cascade's target. */
const SEED: FakeNote[] = [
  makeNote({ id: 'note-a', title: 'Note A' }),
  makeNote({ id: 'folder-f', title: 'Folder F', isFolder: true, position: 1 }),
  makeNote({ id: 'note-in-f', title: 'Note In F', parentId: 'folder-f' }),
];

let notesById: Map<string, FakeNote>;

/**
 * `prisma.note.findMany` serves three different reads here, told apart by
 * their `select` — the shape each action asks for is the only thing that
 * distinguishes them, and answering all three with the tree shape fed the
 * archive cascade rows it could not walk.
 */
const findMany = mock(
  (args: {
    where?: { parentId?: string | null; archivedAt?: null };
    select?: Record<string, unknown>;
  }) => {
    const select = args.select ?? {};
    const rows = [...notesById.values()];

    // `archiveNote`/`restoreNote`: every row this owner has, id + parent only.
    if (select.parentId === true && select.title === undefined) {
      return Promise.resolve(
        rows.map(({ id, parentId }) => ({ id, parentId }))
      );
    }

    // `updateNote`'s link-target resolution: ids only.
    if (Object.keys(select).length === 1 && select.id === true) {
      return Promise.resolve([]);
    }

    // `getNoteChildren`: one level.
    const parentId = args.where?.parentId ?? null;
    return Promise.resolve(
      rows
        .filter((row) => row.parentId === parentId)
        .filter(
          (row) => args.where?.archivedAt !== null || row.archivedAt === null
        )
        .map((row) => ({ ...row, labels: [], _count: { children: 0 } }))
    );
  }
);

const findFirstOrThrow = mock((args: { where: { id: string } }) => {
  const row = notesById.get(args.where.id);
  if (!row) return Promise.reject(new Error('Note not found'));
  return Promise.resolve({ ...row, labels: [] });
});

/**
 * Both the autosave's `updateNote` (`where.id` is a string) and the archive
 * cascade (`where.id` is `{ in: [...] }`). Kept as one delegate because
 * Prisma has one.
 */
const updateMany = mock(
  (args: {
    where: { id: string | { in: string[] } };
    data: Record<string, unknown>;
  }) => {
    const where = args.where.id;
    const ids = typeof where === 'string' ? [where] : where.in;
    let count = 0;
    for (const id of ids) {
      const row = notesById.get(id);
      if (!row) continue;
      Object.assign(row, args.data, { updatedAt: new Date() });
      count += 1;
    }
    return Promise.resolve({ count });
  }
);

/**
 * `deleteNote` names the whole subtree in its `where` (`{ id: { in: [...] } }`)
 * so it can REPORT what it destroyed. The rows still go through the FK
 * cascade, which is why this keeps walking down from whatever it is given
 * rather than trusting the list: a row created under a doomed folder after
 * that list was read is deleted by the database all the same, and a fake that
 * only honoured the list would be a weaker cascade than the real one.
 */
const deleteMany = mock(
  (args: { where: { id: string | { in: string[] } } }) => {
    const where = args.where.id;
    const doomed = new Set(typeof where === 'string' ? [where] : where.in);

    for (let grew = true; grew; ) {
      grew = false;
      for (const row of notesById.values()) {
        if (
          row.parentId !== null &&
          doomed.has(row.parentId) &&
          !doomed.has(row.id)
        ) {
          doomed.add(row.id);
          grew = true;
        }
      }
    }

    let count = 0;
    for (const id of doomed) {
      if (notesById.delete(id)) count += 1;
    }
    return Promise.resolve({ count });
  }
);

Object.defineProperty(prisma, 'note', {
  value: {
    findMany,
    findFirstOrThrow,
    updateMany,
    deleteMany,
    count: mock(() => Promise.resolve(0)),
    findFirst: mock(() => Promise.resolve(null)),
    create: mock(() => Promise.reject(new Error('not exercised'))),
  },
  writable: true,
  configurable: true,
});

Object.defineProperty(prisma, 'noteLabel', {
  value: { findMany: mock(() => Promise.resolve([])) },
  writable: true,
  configurable: true,
});

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

// Three actions share `$queryRaw` — the ancestor chain, the descendant count
// and the share exposure — so the mock has to read the SQL to know which is
// asking. Answering them all alike fed the breadcrumb rows with no `id`.
const queryRaw = mock((sql: TemplateStringsArray, noteId?: string) => {
  const text = sql.join('');
  if (text.includes('ancestors')) return Promise.resolve([]);
  if (text.includes('email')) return Promise.resolve([]);
  const target = notesById.get(noteId ?? '');
  const count = target
    ? [...notesById.values()].filter((row) => row.parentId === target.id).length
    : 0;
  return Promise.resolve([{ count }]);
});
Object.defineProperty(prisma, '$queryRaw', {
  value: queryRaw,
  writable: true,
  configurable: true,
});

// `toast` is a plain imported object, so `spyOn` is the sanctioned technique
// (AGENTS §10). Installed at module scope and only cleared between tests:
// restoring it would put the real implementation back for every later test.
const errorToast = spyOn(toast, 'error');

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

/** Real wall-clock time, deliberately not fake timers — see
 *  `note-editor.spec.tsx`'s header for why this suite waits them out. */
async function settle(ms: number) {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });
}

/** Every `updateNote` this run sent, as `{ id, title }`. The archive cascade
 *  also goes through `updateMany`, so a save is identified by what it wrote. */
function savesSent(): { id: string; title: unknown }[] {
  return updateMany.mock.calls
    .map(([args]) => args)
    .filter((args) => typeof args.where.id === 'string' && 'title' in args.data)
    .map((args) => ({ id: args.where.id as string, title: args.data.title }));
}

/**
 * Holds the NEXT `updateMany` open until `release()` runs, so a test can
 * observe the widget WHILE a mutation is in flight — the only way to see a
 * pending affordance at all.
 */
function gateNextUpdateMany(): { release: () => void } {
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const real = updateMany.getMockImplementation();
  updateMany.mockImplementationOnce(async (args) => {
    await gate;
    return real!(args);
  });
  return { release };
}

/** The `⋮` menu inside a given row of the explorer. */
async function openRowMenu(rowLabel: string) {
  const row = (await screen.findByText(rowLabel)).closest('div');
  expect(row === null).toBe(false);
  fireEvent.pointerDown(
    within(row as HTMLElement).getByLabelText('Note actions'),
    { button: 0, ctrlKey: false }
  );
}

beforeEach(() => {
  notesById = new Map(SEED.map((row) => [row.id, { ...row }]));
  findMany.mockClear();
  findFirstOrThrow.mockClear();
  updateMany.mockClear();
  deleteMany.mockClear();
  queryRaw.mockClear();
  errorToast.mockClear();
  __resetNavigation('/space/notes');
});

afterEach(() => {
  cleanup();
});

describe('deleting the open note', () => {
  /**
   * The bug: `remove` closed the editor, React unmounted it, and the
   * departure flush — which exists so a switch or a tab close never loses an
   * un-debounced keystroke — could not tell that unmount apart from any
   * other. It sent the pending buffer to a row the same click had just
   * removed, so "Note deleted" was followed by a red "Could not save the
   * note." and an IndexedDB record written back for a note that was gone.
   *
   * The edit is made and the delete confirmed INSIDE the debounce window on
   * purpose: `flushPending` returns early on a buffer equal to what was last
   * sent, so a note with nothing pending cannot reach the bug at all.
   */
  test('does not save into a note it has just deleted', async () => {
    const queryClient = makeQueryClient();
    render(<Harness queryClient={queryClient} noteId="note-a" />);
    await screen.findByDisplayValue('Note A');

    fireEvent.change(screen.getByRole('textbox', { name: 'Note title' }), {
      target: { value: 'Note A edited' },
    });

    fireEvent.pointerDown(
      within(screen.getByRole('main')).getByLabelText('Note actions'),
      { button: 0, ctrlKey: false }
    );
    fireEvent.click(
      await screen.findByRole('menuitem', { name: 'Delete permanently' })
    );
    fireEvent.click(
      await screen.findByRole('button', { name: 'Delete permanently' })
    );

    await waitFor(() => expect(deleteMany).toHaveBeenCalled());
    // Long enough for the unmount's flush — and for the debounce it bypasses
    // — to have produced a request if either still would.
    await settle(1400);

    expect(savesSent().filter((save) => save.id === 'note-a')).toEqual([]);
    // The toast is the symptom the author actually saw, and it is a separate
    // observable: a save rejected by `updateNoteSchema` never reaches Prisma
    // at all, so the counter above cannot see one on its own.
    expect(errorToast).not.toHaveBeenCalled();
  }, 20_000);
});

describe('deleting a folder the open note lives in', () => {
  /**
   * The same hole `archiveNote` had, in the version that cannot be undone.
   * `deleteNote` leaned on the database cascade and never learned which
   * descendants went with the folder, so the widget's "was that my note?"
   * comparison missed every one of them: the editor stayed open on a
   * PERMANENTLY deleted note, with the URL still naming it.
   */
  test('closes the editor on a descendant of the deleted folder', async () => {
    const queryClient = makeQueryClient();
    render(<Harness queryClient={queryClient} noteId="note-in-f" />);
    await screen.findByDisplayValue('Note In F');

    await openRowMenu('Folder F');
    fireEvent.click(
      await screen.findByRole('menuitem', { name: 'Delete permanently' })
    );
    fireEvent.click(
      await screen.findByRole('button', { name: 'Delete permanently' })
    );

    // A boolean rather than `findByText`, for the reason the archive case
    // above records: a failing query prints the whole rendered tree.
    await waitFor(() =>
      expect(screen.queryByText('Select a note, or create one.') !== null).toBe(
        true
      )
    );
    await waitFor(() => expect(__navigations).toContain('/space/notes'));
    expect(notesById.has('note-in-f')).toBe(false);
  }, 20_000);

  /**
   * And the second half of it: the departure flush.
   *
   * `hasNoteBeenDeleted` matched the mutation's VARIABLES, which name the
   * folder — never the descendant the editor was showing. So the unmount this
   * delete causes looked like an ordinary pane switch, and the pending
   * keystroke was sent to a row the database had permanently dropped: a red
   * "Could not save the note." one beat after "Note deleted", for a note that
   * no longer exists.
   *
   * The edit is made inside the debounce window on purpose — `flushPending`
   * returns early when nothing is pending, so a settled note cannot reach
   * this at all.
   */
  test('does not save into a descendant it has just deleted', async () => {
    const queryClient = makeQueryClient();
    render(<Harness queryClient={queryClient} noteId="note-in-f" />);
    await screen.findByDisplayValue('Note In F');

    fireEvent.change(screen.getByRole('textbox', { name: 'Note title' }), {
      target: { value: 'Note In F edited' },
    });

    await openRowMenu('Folder F');
    fireEvent.click(
      await screen.findByRole('menuitem', { name: 'Delete permanently' })
    );
    fireEvent.click(
      await screen.findByRole('button', { name: 'Delete permanently' })
    );

    await waitFor(() => expect(deleteMany).toHaveBeenCalled());
    await settle(1400);

    expect(savesSent().filter((save) => save.id === 'note-in-f')).toEqual([]);
    expect(errorToast).not.toHaveBeenCalled();
  }, 20_000);
});

describe('archiving a folder the open note lives in', () => {
  /**
   * The bug: `archiveNote` cascades to the whole subtree, but only the
   * clicked id came back, so the widget's "was that my note?" comparison
   * missed every descendant. The editor stayed open on a note that was now
   * in the trash — off the tree, still on the URL, and still being autosaved
   * into, since `updateNote` does not refuse an archived row.
   *
   * Closing is the behaviour a DIRECT archive of the open note has always
   * had; which row was clicked is a detail of the cascade, not a different
   * intent.
   */
  test('closes the editor on a descendant of the archived folder', async () => {
    const queryClient = makeQueryClient();
    render(<Harness queryClient={queryClient} noteId="note-in-f" />);
    await screen.findByDisplayValue('Note In F');

    await openRowMenu('Folder F');
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Archive' }));

    // Asserted through a boolean rather than `findByText`, for the reason
    // `note-manager.spec.tsx` records: on the red side of this test the query
    // fails and testing-library prints the entire rendered tree, which buries
    // the one line that says what went wrong.
    await waitFor(() =>
      expect(screen.queryByText('Select a note, or create one.') !== null).toBe(
        true
      )
    );
    // The URL has to leave the archived note too, or a reload reopens it.
    await waitFor(() => expect(__navigations).toContain('/space/notes'));
  }, 20_000);

  test('leaves an unrelated open note alone', async () => {
    const queryClient = makeQueryClient();
    render(<Harness queryClient={queryClient} noteId="note-a" />);
    await screen.findByDisplayValue('Note A');

    await openRowMenu('Folder F');
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Archive' }));

    await waitFor(() =>
      expect(notesById.get('folder-f')?.archivedAt).toBeInstanceOf(Date)
    );
    // Still the open note: reporting the cascade must not turn into closing
    // the editor for every archive anywhere in the tree.
    expect(screen.getByDisplayValue('Note A')).toBeTruthy();
    expect(__navigations).not.toContain('/space/notes');
  }, 20_000);
});

/**
 * The explorer's Delete/Backspace confirmation is the one place a cascading
 * archive is announced before it happens, and the dialog cannot time its own
 * dismissal: it does not own the mutation, and its `open` is derived from the
 * panel's state. Closing it on the CLICK — which is what the panel used to do
 * — put the confirmation off screen before the subtree-wide write had been
 * dispatched, so both the pending state and the failure case were invisible.
 */
describe('the archive confirmation', () => {
  /** Selects `Folder F` in the explorer and asks to archive it. */
  async function requestArchive() {
    const folderRow = await screen.findByText('Folder F');
    fireEvent.click(folderRow);
    fireEvent.keyDown(folderRow, { key: 'Delete' });
    return screen.findByRole('button', { name: 'Move to archive' });
  }

  test('stays on screen, disabled, while the cascade is in flight', async () => {
    const queryClient = makeQueryClient();
    render(<Harness queryClient={queryClient} />);

    const gate = gateNextUpdateMany();
    const confirm = await requestArchive();
    fireEvent.click(confirm);

    // The pending state the dialog can only show if the panel reports it.
    // `queryByRole`, not `getByRole`: on the red side of this test the dialog
    // is already gone, and a throwing query prints the whole rendered tree.
    await waitFor(() =>
      expect(
        screen
          .queryByRole('button', { name: 'Move to archive' })
          ?.hasAttribute('disabled') ?? false
      ).toBe(true)
    );

    gate.release();

    await waitFor(() =>
      expect(screen.queryByRole('alertdialog') === null).toBe(true)
    );
    expect(notesById.get('folder-f')?.archivedAt).toBeInstanceOf(Date);
  }, 20_000);

  test('survives a failed archive so the author can try again', async () => {
    const queryClient = makeQueryClient();
    render(<Harness queryClient={queryClient} />);

    updateMany.mockImplementationOnce(() =>
      Promise.reject(new Error('database unavailable'))
    );
    const confirm = await requestArchive();
    fireEvent.click(confirm);

    await waitFor(() => expect(errorToast).toHaveBeenCalled());
    // Nothing moved, and the confirmation is still the thing on screen —
    // closing here is how a destructive action that did not happen looks
    // exactly like one that did.
    expect(notesById.get('folder-f')?.archivedAt).toBeNull();
    expect(screen.queryByRole('alertdialog') === null).toBe(false);
  }, 20_000);
});
