/**
 * What the note menu offers while a create it did not start is still running.
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
 */
import { prisma } from '@byte-of-me/db';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { NextIntlClientProvider } from 'next-intl';

import { useNoteActionItems } from './use-note-action-items';
import { useCreateNote } from './use-note-mutations';

const messages = {
  dashboard: {
    note: {
      untitled: 'Untitled',
      untitledFolder: 'New folder',
      errors: { create: 'Could not create the note.' },
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

Object.defineProperty(prisma, 'note', {
  value: { findFirst, create },
  writable: true,
  configurable: true,
});

/** The menu, as a second one would mount it — knowing nothing of the first. */
function Menu() {
  const items = useNoteActionItems({
    noteId: 'note-1',
    isArchived: false,
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

/** The menu that STARTED the create, and is gone by the time it lands. */
function Starter() {
  const createNote = useCreateNote();

  return (
    <button type="button" onClick={() => createNote.mutate({})}>
      start
    </button>
  );
}

function renderProbe() {
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
        <Menu />
      </NextIntlClientProvider>
    </QueryClientProvider>
  );
}

function isDisabled(itemId: string): string | null {
  return screen.getByTestId(itemId).getAttribute('data-disabled');
}

beforeEach(() => {
  releaseCreate = null;
  findFirst.mockClear();
  create.mockClear();
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
});
