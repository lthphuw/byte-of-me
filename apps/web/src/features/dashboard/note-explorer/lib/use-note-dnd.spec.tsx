/**
 * The explorer's drop handler, exercised directly rather than through
 * dnd-kit's pointer machinery: `onDragEnd` is a plain function of the event
 * dnd-kit hands it, and simulating drag gestures in happy-dom would test the
 * library, not this hook.
 *
 * What is defended here is the one thing Task 7 changed about it — the cycle
 * guard and the drop target now come from the rows currently LOADED into the
 * per-level caches instead of from a whole-corpus query — plus the reason that
 * source is a getter rather than an array.
 */
import { prisma } from '@byte-of-me/db';
import { type DragEndEvent } from '@dnd-kit/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { NextIntlClientProvider } from 'next-intl';

import { useNoteDnd } from './use-note-dnd';

import type { NoteTreeNode } from '@/entities/note';

const messages = {
  dashboard: {
    note: {
      errors: { save: 'Could not save the note.' },
      // ExplorerDnd reads this namespace unconditionally, for the
      // confirmation shown when a drop would expose a note to a shared folder.
      // Values must match `messages/en.json` EXACTLY: next-intl generates
      // literal types from the catalogue, so a paraphrase here is a type
      // error rather than a harmless stand-in.
      move: {
        sharedTitle: 'Move into a shared folder?',
        sharedDescription:
          '“{title}” will become visible to {count, plural, one {# person} other {# people}} who can already open the destination.',
        sharedConfirm: 'Move anyway',
        sharedCancel: 'Cancel',
      },
    },
  },
} as const;

const AT = new Date('2026-01-01T00:00:00.000Z');

function node(
  overrides: Partial<NoteTreeNode> & { id: string }
): NoteTreeNode {
  return {
    title: overrides.id,
    parentId: null,
    position: 0,
    isPinned: false,
    archivedAt: null,
    updatedAt: AT,
    createdAt: AT,
    status: 'draft',
    isFolder: false,
    labelIds: [],
    childCount: 0,
    ...overrides,
  };
}

const FOLDER = node({ id: 'folder-1', isFolder: true, childCount: 1 });
const CHILD = node({ id: 'child-1', parentId: 'folder-1' });
const NOTE_A = node({ id: 'note-a', position: 1 });

/** `moveNote`'s ancestry read — the server-side half of the same guard. */
const findMany = mock(() =>
  Promise.resolve([
    { id: 'folder-1', parentId: null },
    { id: 'child-1', parentId: 'folder-1' },
    { id: 'note-a', parentId: null },
  ])
);
/** Typed by its argument, not just its result: these tests assert on the
 *  `where`/`data` the move wrote, and an untyped mock records `never`. */
const update = mock(
  (_args: {
    where: { id: string };
    data: { parentId: string | null; position: number };
  }) => Promise.resolve({ id: 'note-a' })
);
const updateMany = mock(() => Promise.resolve({ count: 0 }));

Object.defineProperty(prisma, 'note', {
  value: { findMany, update, updateMany },
  writable: true,
  configurable: true,
});
Object.defineProperty(prisma, '$transaction', {
  value: (operations: Promise<unknown>[]) => Promise.all(operations),
  writable: true,
  configurable: true,
});

/**
 * A drop, as dnd-kit reports it. Only the four fields `onDragEnd` reads are
 * populated; the double assertion is what keeps the other twenty out of a test
 * that does not care about them.
 */
function drop(dragged: NoteTreeNode, overId: string): DragEndEvent {
  return {
    active: { id: `note:${dragged.id}`, data: { current: { node: dragged } } },
    over: { id: overId, data: { current: {} } },
  } as unknown as DragEndEvent;
}

type DropHandler = (event: DragEndEvent) => void;

function Probe({
  loadedRows,
  onReady,
}: {
  loadedRows: () => NoteTreeNode[];
  onReady: (handler: DropHandler) => void;
}) {
  const { onDragEnd } = useNoteDnd(loadedRows, []);
  onReady(onDragEnd);
  return null;
}

/** Mounts the hook and hands back its current drop handler. */
function mountDnd(loadedRows: () => NoteTreeNode[]): () => DropHandler {
  let handler: DropHandler | null = null;
  render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
        })
      }
    >
      <NextIntlClientProvider locale="en" messages={messages}>
        <Probe
          loadedRows={loadedRows}
          onReady={(next) => {
            handler = next;
          }}
        />
      </NextIntlClientProvider>
    </QueryClientProvider>
  );

  return () => {
    if (!handler) throw new Error('useNoteDnd never produced a drop handler');
    return handler;
  };
}

beforeEach(() => {
  findMany.mockClear();
  update.mockClear();
  updateMany.mockClear();
});

afterEach(() => {
  cleanup();
});

describe('useNoteDnd drop handling', () => {
  test('refuses a drop onto a descendant that is loaded, without a round trip', () => {
    // `child-1` is only ever visible when `folder-1` is expanded, and an
    // expanded folder has had its level fetched — which is exactly why the
    // guard stays correct on the loaded rows alone.
    const onDragEnd = mountDnd(() => [FOLDER, CHILD, NOTE_A]);

    onDragEnd()(drop(FOLDER, 'into:child-1'));

    // `moveNote`'s first act is the ancestry read; not reaching it is how this
    // spec observes that the drop was refused client-side rather than by the
    // server (which would refuse it too, with a toast instead of silence).
    expect(findMany).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  test('nests a note under a loaded folder', async () => {
    const onDragEnd = mountDnd(() => [FOLDER, CHILD, NOTE_A]);

    onDragEnd()(drop(NOTE_A, 'into:folder-1'));

    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    const args = update.mock.calls[0][0];
    expect(args.where.id).toBe('note-a');
    expect(args.data.parentId).toBe('folder-1');
    // One past the highest position among the LOADED siblings of `folder-1`.
    expect(args.data.position).toBe(1);
  });

  test('reads the loaded rows at drop time, not at render time', async () => {
    // The panel does not re-render when a folder's level settles inside
    // `NoteTreeItem`, so a set captured when the hook last rendered would be
    // missing exactly the rows the author just revealed — and dropping onto
    // one of them would find no target and quietly do nothing.
    const loaded: NoteTreeNode[] = [FOLDER, NOTE_A];
    const onDragEnd = mountDnd(() => loaded);

    loaded.push(CHILD);
    onDragEnd()(drop(NOTE_A, 'before:child-1'));

    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    const args = update.mock.calls[0][0];
    // Inserted as a sibling of `child-1`, in its slot — the shape of an
    // "insert before" drop, and proof the target row was found at all.
    expect(args.data.parentId).toBe('folder-1');
    expect(args.data.position).toBe(0);
  });
});
