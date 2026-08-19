/**
 * What the note menu offers while a mutation it did not start is still running.
 *
 * Radix unmounts this menu's content the moment an item is chosen, so the
 * `useCreateNote` instance the hook mounts — and its `isPending` — is gone
 * before the server has answered. A `disabled` flag read from that observer is
 * therefore never true on any menu the author can see: reopening the menu
 * mid-create offered "New note inside" again, and taking it created a second
 * note and fired a second navigation on top of the first.
 *
 * The menu reopening is a fresh mount, which is why the probe below mounts a
 * SECOND `useNoteActionItems` rather than re-rendering the first one — a
 * component that re-rendered would prove nothing about the case that broke.
 *
 * Pin, archive and restore carried the identical dead flag and are covered
 * here too. Archive is the one that costs something: it cascades, so a second
 * take re-archives a whole subtree already on its way to the trash.
 */
import { prisma } from '@byte-of-me/db';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { NextIntlClientProvider } from 'next-intl';

import { useNoteActionItems } from './use-note-action-items';
import { useCreateNote, useNoteMutations } from './use-note-mutations';

const messages = {
  dashboard: {
    note: {
      untitled: 'Untitled',
      untitledFolder: 'New folder',
      errors: {
        create: 'Could not create the note.',
        archive: 'Could not archive the note.',
        restore: 'Could not restore the note.',
        save: 'Could not save the note.',
      },
      toasts: {
        archived: 'Moved to archive',
        restored: 'Note restored',
      },
      actions: {
        newNoteInside: 'New note inside',
        newFolderInside: 'New folder inside',
        rename: 'Rename',
        share: 'Share',
        pin: 'Pin',
        unpin: 'Unpin',
        archive: 'Archive',
        restore: 'Restore',
        deleteForever: 'Delete permanently',
      },
    },
  },
} as const;

const AT = new Date('2026-01-01T00:00:00.000Z');

/** Held open until `releaseCreate()` runs, so the create stays in flight. */
let releaseCreate: (() => void) | null = null;

const findFirst = mock(() => Promise.resolve(null));
const create = mock(async (args: { data: Record<string, unknown> }) => {
  await new Promise<void>((resolve) => {
    releaseCreate = resolve;
  });
  return {
    id: 'new-note-id',
    content: '',
    createdAt: AT,
    updatedAt: AT,
    status: 'draft',
    properties: null,
    isFolder: false,
    labels: [],
    ...args.data,
  };
});

/**
 * Held open until `releaseWrite()` runs. One gate serves all three: archive,
 * restore and pin every reach the table through `updateMany`, and each test
 * starts exactly one of them.
 */
let releaseWrite: (() => void) | null = null;
const updateMany = mock(async () => {
  await new Promise<void>((resolve) => {
    releaseWrite = resolve;
  });
  return { count: 1 };
});
/** The owner's `(id, parentId)` rows, which the two cascades walk. */
const findMany = mock(() =>
  Promise.resolve([{ id: 'note-1', parentId: null }])
);
/** `updateNote`'s read-back, which the pin applies to the detail key. */
const findFirstOrThrow = mock(() =>
  Promise.resolve({
    id: 'note-1',
    title: 'Note One',
    content: '',
    parentId: null,
    position: 0,
    isPinned: true,
    archivedAt: null,
    createdAt: AT,
    updatedAt: AT,
    status: 'draft',
    properties: null,
    isFolder: false,
    labels: [],
  })
);

Object.defineProperty(prisma, 'note', {
  value: { findFirst, create, findMany, updateMany, findFirstOrThrow },
  writable: true,
  configurable: true,
});

/** The menu, as a second one would mount it — knowing nothing of the first. */
function Menu({ isArchived = false }: { isArchived?: boolean }) {
  const items = useNoteActionItems({
    noteId: 'note-1',
    isArchived,
    isPinned: false,
    onRequestDelete: () => {},
    onRequestShare: () => {},
  });

  return (
    <ul>
      {items.map((item) => (
        <li key={item.id} data-testid={item.id} data-disabled={item.disabled}>
          {item.label}
        </li>
      ))}
    </ul>
  );
}

/** The menu that STARTED the mutation, and is gone by the time it lands. */
function Starter() {
  const createNote = useCreateNote();
  const { archive, restore, pin } = useNoteMutations();

  return (
    <>
      <button type="button" onClick={() => createNote.mutate({})}>
        start
      </button>
      <button type="button" onClick={() => archive.mutate('note-1')}>
        start archive
      </button>
      <button type="button" onClick={() => restore.mutate('note-1')}>
        start restore
      </button>
      <button
        type="button"
        onClick={() => pin.mutate({ id: 'note-1', isPinned: true })}
      >
        start pin
      </button>
    </>
  );
}

function renderProbe(isArchived = false) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={messages}>
        <Starter />
        <Menu isArchived={isArchived} />
      </NextIntlClientProvider>
    </QueryClientProvider>
  );
}

function isDisabled(itemId: string): string | null {
  return screen.getByTestId(itemId).getAttribute('data-disabled');
}

beforeEach(() => {
  releaseCreate = null;
  releaseWrite = null;
  findFirst.mockClear();
  create.mockClear();
  findMany.mockClear();
  updateMany.mockClear();
  findFirstOrThrow.mockClear();
});

afterEach(cleanup);

describe('useNoteActionItems', () => {
  test('disables the create items while a create started elsewhere is in flight', async () => {
    renderProbe();
    expect(isDisabled('new-note-inside')).toBe('false');

    screen.getByRole('button', { name: 'start' }).click();

    await waitFor(() => expect(isDisabled('new-note-inside')).toBe('true'));
    expect(isDisabled('new-folder-inside')).toBe('true');

    releaseCreate?.();

    await waitFor(() => expect(isDisabled('new-note-inside')).toBe('false'));
  });

  test('disables pin while a pin started elsewhere is in flight', async () => {
    renderProbe();
    expect(isDisabled('pin')).toBe('false');

    screen.getByRole('button', { name: 'start pin' }).click();

    await waitFor(() => expect(isDisabled('pin')).toBe('true'));

    releaseWrite?.();

    await waitFor(() => expect(isDisabled('pin')).toBe('false'));
  });

  // The one that costs something. Archiving cascades to the whole subtree, so
  // an item that stays live while the first archive is still running lets a
  // second take re-run that cascade.
  test('disables archive while an archive started elsewhere is in flight', async () => {
    renderProbe();
    expect(isDisabled('archive')).toBe('false');

    screen.getByRole('button', { name: 'start archive' }).click();

    await waitFor(() => expect(isDisabled('archive')).toBe('true'));

    releaseWrite?.();

    await waitFor(() => expect(isDisabled('archive')).toBe('false'));
  });

  test('disables restore while a restore started elsewhere is in flight', async () => {
    renderProbe(true);
    expect(isDisabled('restore')).toBe('false');

    screen.getByRole('button', { name: 'start restore' }).click();

    await waitFor(() => expect(isDisabled('restore')).toBe('true'));

    releaseWrite?.();

    await waitFor(() => expect(isDisabled('restore')).toBe('false'));
  });
});
