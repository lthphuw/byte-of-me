/**
 * What this spec defends: confirming a subtree-wide archive does not, by
 * itself, take the confirmation off screen.
 *
 * `AlertDialogAction` is `DialogPrimitive.Close`, so Radix composes the handler
 * given to it with `onOpenChange(false)` through `composeEventHandlers`, which
 * honours `defaultPrevented`. Without the `preventDefault()` this dialog was
 * gone on the click and the cascading archive ran with nothing but a toast for
 * it. Dismissal is the caller's to time — see the component's own note — so
 * what is pinned here is that the dialog never dismisses itself, and that it
 * shows the pending state the caller reports.
 *
 * `getDescendantCount` runs for real against a faked `$queryRaw` (never
 * `mock.module()`), the same way `delete-note-dialog.spec.tsx` does it.
 */
import { useState } from 'react';
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

import { ArchiveNoteDialog } from './archive-note-dialog';

import type { NoteTreeNode } from '@/entities/note';

const messages = {
  dashboard: {
    note: {
      archiveConfirm: {
        title: 'Move “{title}” to the archive?',
        description: 'You can restore it from the Archived view.',
        descriptionWithChildren:
          '{count, plural, one {Its # nested note} other {Its # nested notes}} will go with it. You can restore them from the Archived view.',
        confirm: 'Move to archive',
        cancel: 'Cancel',
      },
    },
  },
} as const;

const NODE: NoteTreeNode = {
  id: 'note-1',
  title: 'Kafka',
  parentId: null,
  position: 0,
  isPinned: false,
  isFolder: true,
  archivedAt: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  status: 'draft',
  labelIds: [],
  childCount: 4,
};

const queryRaw = mock(() => Promise.resolve([{ count: 4 }]));
Object.defineProperty(prisma, '$queryRaw', {
  value: queryRaw,
  writable: true,
  configurable: true,
});

/**
 * `node` lives in state and `onOpenChange` clears it, which is what the tree
 * panel does. Pinning it to a constant would let a dialog that closes itself
 * stay on screen through the whole spec and every assertion would pass against
 * the bug.
 */
function renderDialog(isPending = false) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const onOpenChange = mock((_open: boolean) => {});
  const onConfirm = mock((_noteId: string) => {});

  function Harness() {
    const [node, setNode] = useState<NoteTreeNode | null>(NODE);
    return (
      <ArchiveNoteDialog
        node={node}
        isPending={isPending}
        onOpenChange={(open) => {
          onOpenChange(open);
          if (!open) setNode(null);
        }}
        onConfirm={onConfirm}
      />
    );
  }

  render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={messages}>
        <Harness />
      </NextIntlClientProvider>
    </QueryClientProvider>
  );

  return { onOpenChange, onConfirm };
}

const confirmButton = () =>
  screen.getByRole('button', { name: 'Move to archive' });

beforeEach(() => {
  queryRaw.mockClear();
});

afterEach(() => {
  cleanup();
});

describe('ArchiveNoteDialog', () => {
  test('says how much of the subtree is about to move', async () => {
    renderDialog();

    expect(
      await screen.findByText(
        'Its 4 nested notes will go with it. You can restore them from the Archived view.'
      )
    ).toBeTruthy();
  });

  test('confirming runs the archive without dismissing the dialog itself', async () => {
    const { onOpenChange, onConfirm } = renderDialog();

    fireEvent.click(confirmButton());

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith('note-1');
    });
    // Radix's own close, suppressed. The caller decides when this goes — and
    // until it does, the confirmation for a cascading archive is still the
    // thing on screen.
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(screen.getByRole('alertdialog')).toBeTruthy();
  });

  test('reports the caller’s pending archive on both buttons', () => {
    renderDialog(true);

    expect(confirmButton().hasAttribute('disabled')).toBe(true);
    expect(
      screen.getByRole('button', { name: 'Cancel' }).hasAttribute('disabled')
    ).toBe(true);
  });
});
