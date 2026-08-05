/**
 * What this spec defends: the panel's writes reach `updateNote` carrying ONLY
 * `status`/`properties` — never title or content, which belong to the
 * autosave and would collide with it — and removal actually drops the key.
 *
 * Same technique as `note-editor.spec.tsx`: the real server action runs
 * against faked Prisma delegates (never `mock.module()`), the real
 * `updateNoteSchema` validates the write.
 */
import { prisma } from '@byte-of-me/db';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { NextIntlClientProvider } from 'next-intl';

import { NotePropertiesPanel } from './note-properties-panel';

const messages = {
  dashboard: {
    note: {
      errors: { save: 'Could not save the note.' },
      properties: {
        title: 'Properties',
        status: 'Status',
        statusPlaceholder: 'e.g. draft',
        presets: { draft: 'Draft', active: 'Active', done: 'Done' },
        key: 'Property name',
        keyPlaceholder: 'Name',
        value: 'Property value',
        valuePlaceholder: 'Value',
        valueFor: 'Value of {key}',
        add: 'Add property',
        remove: 'Remove {key}',
        labels: 'Labels',
        labelsPlaceholder: 'Add label…',
        removeLabel: 'Remove label {name}',
      },
    },
  },
} as const;

const NOTE = {
  id: 'note-1',
  title: 'Kafka',
  content: '{"type":"doc","content":[]}',
  parentId: null,
  position: 0,
  isPinned: false,
  archivedAt: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  status: 'draft',
  properties: { priority: 2 } as Record<string, unknown> | null,
  isFolder: false,
  labels: [] as { label: { id: string; name: string; color: string | null } }[],
};

const findFirstOrThrow = mock(() => Promise.resolve({ ...NOTE }));
const updateMany = mock(() => Promise.resolve({ count: 1 }));
Object.defineProperty(prisma, 'note', {
  value: { findFirstOrThrow, updateMany },
  writable: true,
  configurable: true,
});

// The panel also lists the owner's labels for its datalist; an unmocked
// delegate would reach for the (deliberately unreachable) test database.
const labelFindMany = mock(() => Promise.resolve([]));
Object.defineProperty(prisma, 'noteLabel', {
  value: { findMany: labelFindMany },
  writable: true,
  configurable: true,
});

function renderPanel() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 60_000 },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={messages}>
        <NotePropertiesPanel noteId={NOTE.id} />
      </NextIntlClientProvider>
    </QueryClientProvider>
  );
}

/** The `data` of the most recent `updateMany` call. */
function lastWrite(): Record<string, unknown> {
  const calls = updateMany.mock.calls as unknown as Array<
    [{ data: Record<string, unknown> }]
  >;
  const call = calls[calls.length - 1];
  if (!call) throw new Error('updateNote never wrote');
  return call[0].data;
}

async function openPanel() {
  renderPanel();
  const disclosure = await screen.findByRole('button', {
    name: /Properties/,
  });
  fireEvent.click(disclosure);
}

describe('NotePropertiesPanel', () => {
  beforeEach(() => {
    findFirstOrThrow.mockClear();
    updateMany.mockClear();
  });

  afterEach(cleanup);

  test('a status chip writes only the status', async () => {
    await openPanel();

    fireEvent.click(screen.getByRole('button', { name: 'Active' }));

    await waitFor(() => expect(updateMany).toHaveBeenCalledTimes(1));
    const data = lastWrite();
    expect(data.status).toBe('active');
    expect(data.title).toBeUndefined();
    expect(data.content).toBeUndefined();
    expect(data.properties).toBeUndefined();
  });

  test('adding a property writes the merged, coerced map', async () => {
    await openPanel();

    fireEvent.change(screen.getByLabelText('Property name'), {
      target: { value: 'done' },
    });
    fireEvent.change(screen.getByLabelText('Property value'), {
      target: { value: 'false' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add property' }));

    await waitFor(() => expect(updateMany).toHaveBeenCalledTimes(1));
    expect(lastWrite().properties).toEqual({ priority: 2, done: false });
  });

  test('removing a property drops exactly that key', async () => {
    await openPanel();

    fireEvent.click(screen.getByRole('button', { name: 'Remove priority' }));

    await waitFor(() => expect(updateMany).toHaveBeenCalledTimes(1));
    expect(lastWrite().properties).toEqual({});
  });
});
