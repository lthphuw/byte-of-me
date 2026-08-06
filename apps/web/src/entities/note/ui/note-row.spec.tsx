/**
 * `NoteRow` has to behave like the `<div>` it replaced.
 *
 * The right-click menu wraps this row in Radix's `ContextMenuTrigger asChild`,
 * which works by CLONING its child with an added `onContextMenu` handler and a
 * ref. Anything that quietly drops those props renders a row that looks
 * perfect and never opens a menu — a failure with no error, no warning and no
 * visual tell.
 *
 * That has happened twice: once when the trigger wrapped the drag shell (a
 * component taking only `{node, children}`), and again the moment this row was
 * extracted out of `NoteTreeItem` into a component of its own. Both times it
 * was found by right-clicking the running app, which is exactly the kind of
 * regression a cheap test should have caught instead.
 */
import { createRef } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, mock, test } from 'bun:test';
import { NextIntlClientProvider } from 'next-intl';

import { NoteRow } from './note-row';

import type { NoteTreeNode } from '@/entities/note/model/types';

afterEach(cleanup);

const messages = {
  dashboard: {
    note: {
      tree: { expandAriaLabel: 'Expand', collapseAriaLabel: 'Collapse' },
    },
  },
} as const;

const NODE: NoteTreeNode = {
  id: 'note-1',
  title: 'Sprint plan',
  parentId: null,
  position: 0,
  isPinned: false,
  archivedAt: null,
  updatedAt: new Date('2026-01-01'),
  createdAt: new Date('2026-01-01'),
  status: 'draft',
  isFolder: false,
  labelIds: [],
  childCount: 0,
};

function renderRow(extra: Record<string, unknown> = {}) {
  const onToggle = mock(() => {});
  const onActivate = mock(() => {});
  const onStartRename = mock(() => {});
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <NoteRow
        node={NODE}
        depth={0}
        isActive={false}
        isExpanded={false}
        hasChildren={false}
        onToggle={onToggle}
        onActivate={onActivate}
        onStartRename={onStartRename}
        onWarm={() => {}}
        {...extra}
      />
    </NextIntlClientProvider>
  );
  return { onToggle, onActivate, onStartRename };
}

describe('NoteRow', () => {
  test('forwards a ref to its root element', () => {
    const ref = createRef<HTMLDivElement>();
    renderRow({ ref });

    // Radix needs this to position and manage the trigger it cloned.
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
    expect(ref.current?.textContent).toContain('Sprint plan');
  });

  test('forwards an injected handler onto the root element', () => {
    const onContextMenu = mock(() => {});
    renderRow({ onContextMenu });

    // Exactly what `ContextMenuTrigger asChild` injects. Dropping it is the
    // silent failure this file exists for.
    fireEvent.contextMenu(screen.getByText('Sprint plan'));

    expect(onContextMenu).toHaveBeenCalledTimes(1);
  });

  test('merges an injected className instead of replacing its own', () => {
    renderRow({ className: 'injected-class', 'data-state': 'open' });

    const row = screen.getByText('Sprint plan').closest('div.injected-class');
    expect(row).toBeTruthy();
    // Its own layout classes have to survive the merge, or the row loses the
    // geometry every other row-shaped thing is aligned to.
    expect(row?.className).toContain('min-h-9');
    expect(row?.getAttribute('data-state')).toBe('open');
  });

  test('expanding does not also activate the row', () => {
    const { onToggle, onActivate } = renderRow({ hasChildren: true });

    fireEvent.click(screen.getByRole('button', { name: 'Expand' }));

    // The chevron sits inside the row that selects a note; opening a folder
    // must not read as "the author picked this one".
    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(onActivate).not.toHaveBeenCalled();
  });

  test('double-clicking the title starts a rename', () => {
    const { onStartRename } = renderRow();

    fireEvent.doubleClick(screen.getByText('Sprint plan'));

    expect(onStartRename).toHaveBeenCalledTimes(1);
  });
});
