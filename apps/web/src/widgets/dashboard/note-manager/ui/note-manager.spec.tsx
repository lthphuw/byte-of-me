/**
 * `NoteManager` composes the tree, the editor and the search palette. Two
 * contracts of its own: the Cmd/Ctrl+K shortcut actually opens the palette
 * (M5 rewrote how that listener decides when to act), and selecting a row
 * in the tree renders the editor for that specific note.
 */
import { prisma } from '@byte-of-me/db';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { NextIntlClientProvider } from 'next-intl';

import { NoteManager } from './note-manager';

const messages = {
  dashboard: {
    note: {
      untitled: 'Untitled',
      loading: 'Loading note…',
      emptySelection: 'Select a note, or create one.',
      tree: { expandAriaLabel: 'Expand', collapseAriaLabel: 'Collapse' },
      fields: { title: 'Note title', titlePlaceholder: 'Untitled' },
      actions: {
        create: 'New note',
        archive: 'Archive',
        restore: 'Restore',
        delete: 'Delete',
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
      empty: { title: 'No notes yet.' },
      errors: {
        load: 'Could not load your notes.',
        create: 'Could not create the note.',
        save: 'Could not save the note.',
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
}

interface FakeNoteDetail extends FakeNoteTreeRow {
  content: string;
  createdAt: Date;
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
};

const notesById = new Map<string, FakeNoteDetail>([[NOTE_A.id, NOTE_A]]);

const findMany = mock(() =>
  Promise.resolve(
    Array.from(notesById.values()).map(
      ({ id, title, parentId, position, isPinned, archivedAt, updatedAt }) => ({
        id,
        title,
        parentId,
        position,
        isPinned,
        archivedAt,
        updatedAt,
      })
    )
  )
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

function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 60_000 },
      mutations: { retry: false },
    },
  });
}

function Harness({ queryClient }: { queryClient: QueryClient }) {
  return (
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={messages}>
        <NoteManager />
      </NextIntlClientProvider>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  findMany.mockClear();
  findFirstOrThrow.mockClear();
  updateMany.mockClear();
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

  test('selecting a tree row renders the editor for that note', async () => {
    const queryClient = makeQueryClient();
    render(<Harness queryClient={queryClient} />);
    await screen.findByText('Select a note, or create one.');

    fireEvent.click(await screen.findByText('Note A'));

    expect(await screen.findByDisplayValue('Note A')).toBeTruthy();
    expect(screen.queryByText('Select a note, or create one.')).toBeNull();
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
    render(<Harness queryClient={queryClient} />);
    await screen.findByText('Select a note, or create one.');

    fireEvent.click(await screen.findByText('Note A'));
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
    render(<Harness queryClient={queryClient} />);
    await screen.findByText('Select a note, or create one.');

    fireEvent.click(await screen.findByText('Note A'));
    const titleInput = await screen.findByDisplayValue('Note A');

    fireEvent.keyDown(titleInput, { key: 'k', metaKey: true });

    expect(
      await screen.findByPlaceholderText('Search your notes…')
    ).toBeTruthy();
  });
});
