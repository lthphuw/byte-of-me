/**
 * What this spec defends: a PERMANENT, cascading delete never runs with its own
 * confirmation already off screen.
 *
 * `AlertDialogAction` is `DialogPrimitive.Close`, and Radix composes the
 * handler passed to it with `onOpenChange(false)` through
 * `composeEventHandlers`, which honours `defaultPrevented`. Without the
 * `preventDefault()` in the dialog the close wins the race with the mutation:
 * the author sees the dialog vanish the instant they click, the delete runs
 * unattended, and the `disabled={remove.isPending}` on that same button is dead
 * code that can never paint. Every assertion below is about that window.
 *
 * Same technique as `note-properties-panel.spec.tsx`: the real `deleteNote`,
 * `getDescendantCount` and `getNoteShareExposure` server actions run against
 * faked Prisma delegates (never `mock.module()`; `spyOn` does not work on a
 * Prisma 7 delegate), so the failure path under test is the action's real one
 * rather than a constructed error.
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

import { DeleteNoteDialog } from './delete-note-dialog';

import { privateStorage } from '@/shared/api/s3-storage-api';

const messages = {
  dashboard: {
    note: {
      errors: { delete: 'Could not delete the note.' },
      toasts: { deleted: 'Note deleted' },
      delete: {
        title: 'Delete permanently?',
        description: '“{title}” will be deleted for good. This cannot be undone.',
        descriptionWithChildren:
          '“{title}” and {count, plural, one {its # nested note} other {its # nested notes}} will be deleted for good. This cannot be undone.',
        descriptionShared:
          '{count, plural, one {# person} other {# people}} can currently open this. Deleting it removes their access too.',
        impactUnknown:
          'Could not check what this affects. It may take nested notes with it, and other people may lose access.',
        confirm: 'Delete permanently',
        cancel: 'Cancel',
      },
    },
  },
} as const;

/**
 * One fake for both recursive-CTE reads. `getDescendantCount` reads
 * `rows[0].count` and `getNoteShareExposure` maps `rows[].email`, so a single
 * row carrying both columns answers each of them without this fake having to
 * sniff the SQL it was handed: three descendants, one address that loses
 * access. That is also the row that makes the cascade wording appear.
 */
const queryRaw = mock(() =>
  Promise.resolve([{ count: 3, email: 'reader@example.com' }])
);
Object.defineProperty(prisma, '$queryRaw', {
  value: queryRaw,
  writable: true,
  configurable: true,
});

/**
 * Every note this owner has, as `{ id, parentId }` — the owner-scoped read
 * `deleteNote` now performs BEFORE the write, so it can name the descendants
 * the cascade is about to take.
 *
 * It is also what decides "Note not found": membership in this list. The
 * `deleteMany` count cannot answer that any more, because the write targets
 * the whole subtree rather than one row. Kept consistent with the three
 * descendants `$queryRaw` reports above, so the fake tells one story.
 */
let ownedNotes: { id: string; parentId: string | null }[] = [];
const findMany = mock(() => Promise.resolve(ownedNotes));

let settleDelete: (result: { count: number }) => void = () => {};
const deleteMany = mock(
  () =>
    new Promise<{ count: number }>((resolve) => {
      settleDelete = resolve;
    })
);
Object.defineProperty(prisma, 'note', {
  value: { findMany, deleteMany },
  writable: true,
  configurable: true,
});

// `deleteNote` sweeps the attachment objects the cascade cannot take, so it
// reads this delegate on the way through. Unstubbed, the action reaches for a
// real database — which is refused here, but only after a timeout that reads
// like a hang rather than a missing stub.
Object.defineProperty(prisma, 'noteDocument', {
  value: { findMany: mock().mockResolvedValue([]) },
  writable: true,
  configurable: true,
});
Object.defineProperty(privateStorage, 'deleteFile', {
  value: mock().mockResolvedValue(undefined),
  writable: true,
  configurable: true,
});

/**
 * The harness holds `open` in state and hands `setOpen` straight to the dialog
 * — the shape `note-actions-menu.tsx` and `note-row-context-menu.tsx` both use.
 * That is load-bearing rather than incidental: with `open` pinned to a literal
 * `true`, a dialog that asks to close stays on screen anyway and every
 * assertion below would pass against the bug. Here a spurious close really does
 * unmount it, which is what the author sees.
 */
function renderDialog() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const onOpenChange = mock((_open: boolean) => {});

  function Harness() {
    const [open, setOpen] = useState(true);
    return (
      <DeleteNoteDialog
        noteId="note-1"
        title="Kafka"
        open={open}
        onOpenChange={(next) => {
          onOpenChange(next);
          setOpen(next);
        }}
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

  return { onOpenChange };
}

const confirmButton = () =>
  screen.getByRole('button', { name: 'Delete permanently' });

beforeEach(() => {
  queryRaw.mockClear();
  findMany.mockClear();
  deleteMany.mockClear();
  ownedNotes = [
    { id: 'note-1', parentId: null },
    { id: 'child-1', parentId: 'note-1' },
    { id: 'child-2', parentId: 'note-1' },
    { id: 'grandchild-1', parentId: 'child-1' },
  ];
});

afterEach(() => {
  cleanup();
});

describe('DeleteNoteDialog', () => {
  test('says what the delete will take with it before it runs', async () => {
    renderDialog();

    // The cascade count and the share exposure are the whole reason this
    // dialog is not `ConfirmDeleteDialog`; losing either would make a
    // permanent delete understate its own blast radius.
    expect(
      await screen.findByText(
        '“Kafka” and its 3 nested notes will be deleted for good. This cannot be undone.'
      )
    ).toBeTruthy();
    expect(
      await screen.findByText(
        '1 person can currently open this. Deleting it removes their access too.'
      )
    ).toBeTruthy();
  });

  test('keeps the confirmation on screen, disabled, while the delete is in flight', async () => {
    const { onOpenChange } = renderDialog();

    fireEvent.click(confirmButton());

    await waitFor(() => {
      expect(deleteMany).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(confirmButton().hasAttribute('disabled')).toBe(true);
    });

    // Still mounted, and nobody has been told to close it.
    expect(screen.getByRole('alertdialog')).toBeTruthy();
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  test('a second click cannot start a second delete', async () => {
    renderDialog();

    fireEvent.click(confirmButton());
    await waitFor(() => {
      expect(confirmButton().hasAttribute('disabled')).toBe(true);
    });
    fireEvent.click(confirmButton());

    expect(deleteMany).toHaveBeenCalledTimes(1);
  });

  test('dismisses only once the delete has succeeded', async () => {
    const { onOpenChange } = renderDialog();

    fireEvent.click(confirmButton());
    await waitFor(() => {
      expect(deleteMany).toHaveBeenCalledTimes(1);
    });
    expect(onOpenChange).not.toHaveBeenCalled();

    settleDelete({ count: 1 });

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  test('stays open and names the failure when the delete does not happen', async () => {
    // The action's real failure path, and it MOVED: `deleteNote` now reads the
    // owner's notes before it writes, so that it can report the ids the
    // cascade takes, and a target missing from that read is how a note that is
    // gone — or was never this owner's — comes back. `deleteMany`'s count
    // cannot say it any more; the write covers a whole subtree.
    ownedNotes = [];
    const { onOpenChange } = renderDialog();

    fireEvent.click(confirmButton());

    expect(await screen.findByText('Note not found')).toBeTruthy();
    // Refused before anything was written, which is the other half of "the
    // delete did not happen".
    expect(deleteMany).not.toHaveBeenCalled();
    expect(screen.getByRole('alertdialog')).toBeTruthy();
    // Closing here is how a delete that silently did not happen looks
    // identical to one that did.
    expect(onOpenChange).not.toHaveBeenCalled();
    // And the author can try again.
    expect(confirmButton().hasAttribute('disabled')).toBe(false);
  });
});
