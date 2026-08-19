/**
 * What a create in flight looks like at the level it lands in.
 *
 * Committing a draft row closes it immediately — the name is typed, the
 * mutation is away — and until this, nothing stood in its place: the level
 * snapped back to exactly how it looked before the author started, which is
 * what "nothing happened" means to the person watching. The pending row is
 * what fills that gap, and it has to be at the RIGHT level, so a create inside
 * a folder is asserted not to draw anything at the root.
 *
 * The list is rendered with no rows on purpose. That is the hardest case (an
 * empty level renders nothing at all unless something asks it to) and it keeps
 * the test off `NoteTreeItem`, whose per-level query and drag shell are a
 * different component's contract.
 */
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'bun:test';
import { NextIntlClientProvider } from 'next-intl';

import { NoteTreeList } from './note-tree-list';

import type { NoteExplorerControls } from '@/entities/note/model/types';

afterEach(cleanup);

const messages = {
  dashboard: {
    note: {
      tree: {
        treeAriaLabel: 'Note tree',
        draftNoteLabel: 'New note name',
        draftFolderLabel: 'New folder name',
        expandAriaLabel: 'Expand',
        collapseAriaLabel: 'Collapse',
        renameInputLabel: 'Rename',
      },
    },
  },
} as const;

const EXPLORER: NoteExplorerControls = {
  selectedId: null,
  expandedIds: new Set<string>(),
  draft: null,
  renamingId: null,
  revealId: null,
  select: () => {},
  toggle: () => {},
  submitDraft: () => {},
  cancelDraft: () => {},
  startRename: () => {},
  submitRename: () => {},
  cancelRename: () => {},
  clearReveal: () => {},
};

function renderList(pendingParentIds?: ReadonlySet<string | null>) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <NoteTreeList
        rootRows={[]}
        activeId={null}
        explorer={EXPLORER}
        onSelect={() => {}}
        hasNextPage={false}
        isFetching={false}
        onLoadMore={() => {}}
        pendingParentIds={pendingParentIds}
      />
    </NextIntlClientProvider>
  );
}

describe('NoteTreeList', () => {
  test('renders nothing for an empty level with nothing in flight', () => {
    renderList();

    expect(screen.queryByRole('tree')).toBeNull();
  });

  test('shows a pending row at the root while a root create is in flight', () => {
    const { container } = renderList(new Set([null]));

    const tree = screen.getByRole('tree');
    expect(tree.getAttribute('aria-busy')).toBe('true');
    // `NoteRowSkeleton` renders no text; its bars are `@byte-of-me/ui`'s
    // `Skeleton`, marked by the `animate-pulse` class that component owns.
    expect(container.querySelector('.animate-pulse')).toBeTruthy();
  });

  test('leaves the root alone while the create belongs to a folder', () => {
    renderList(new Set(['folder-1']));

    expect(screen.queryByRole('tree')).toBeNull();
  });
});
