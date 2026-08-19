'use client';

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  useMediaQuery,
} from '@byte-of-me/ui';
import { FolderPlus, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { isModalOpen } from '@/shared/lib/is-modal-open';
import { cn } from '@/shared/lib/utils';

interface ExplorerBlankMenuProps {
  /** Opens a draft row at the ROOT — the only level empty space can mean. */
  onStartDraft: (isFolder: boolean) => void;
  /** Drops the explorer's cursor. Fired only for a press that lands on the
   *  background itself, never on a row. */
  onClickBlank: () => void;
  /** The trash offers neither create, so it renders the surface without a
   *  menu rather than a menu with nothing in it. */
  disabled?: boolean;
  children: React.ReactNode;
}

/**
 * The surface BETWEEN the rows: what a click or a right-click there means.
 *
 * Both gestures used to land on nothing at all. Clicking the background left
 * the last row highlighted with no way to clear it, and right-clicking it
 * opened Chrome's own menu — so the one place in the explorer where "new note
 * at the top level" is the obvious offer was the one place that did not make
 * it.
 *
 * ## Why this wraps the rows instead of sitting behind them
 *
 * The trigger has to FILL the scroller (`min-h-full`) for the empty region
 * below the last row to be right-clickable at all, and a filler that tall
 * would cover the rows if it were a sibling. Wrapping is what lets one element
 * be both the background and the container.
 *
 * A row's own menu still wins, and that is Radix's doing rather than luck:
 * `ContextMenuTrigger` composes handlers with `checkForDefaultPrevented`, and
 * the row's trigger calls `preventDefault()` as it opens. By the time the
 * event reaches this outer trigger it is already defaulted-prevented, so this
 * one declines it instead of opening a second menu on top. The click handler
 * below cannot lean on that, so it tests the target directly.
 *
 * DISABLED ON TOUCH, for the reason `NoteRowContextMenu` sets out at length:
 * Radix opens a context menu on long press and the explorer's `TouchSensor`
 * already claims that gesture at 200ms for dragging. The surface still
 * renders — the blank-click deselect is a tap and has no such conflict.
 */
export function ExplorerBlankMenu({
  onStartDraft,
  onClickBlank,
  disabled = false,
  children,
}: ExplorerBlankMenuProps) {
  const t = useTranslations('dashboard.note');
  // `(pointer: coarse)` rather than a width breakpoint — see
  // `NoteRowContextMenu` for why the input device is what matters.
  const isTouch = useMediaQuery('(pointer: coarse)');

  // `min-h-full` is what makes the empty region a target: without it this box
  // is only as tall as the rows inside it, and everything below the last one
  // belongs to the scroller, which has no handlers.
  const surfaceClass = cn('block min-h-full p-1');

  // The press, not the click: `mousedown` is where focus moves, so clearing
  // here means the highlight goes as the button goes down rather than a frame
  // later. `target !== currentTarget` is the whole test for "this landed on
  // the background" — every row sits in its own element, so a press on one
  // never reports this element as its target.
  const onMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    onClickBlank();
  };

  if (isTouch || disabled) {
    return (
      <div className={surfaceClass} onMouseDown={onMouseDown}>
        {children}
      </div>
    );
  }

  return (
    <ContextMenu>
      {/* A dialog owns the input while it is open — see `NoteRowContextMenu`
          for the same guard and what it was observed doing without one. */}
      <ContextMenuTrigger
        className={surfaceClass}
        onMouseDown={onMouseDown}
        onContextMenu={(event) => {
          if (isModalOpen()) event.preventDefault();
        }}
      >
        {children}
      </ContextMenuTrigger>

      <ContextMenuContent className="w-48">
        <ContextMenuItem onSelect={() => onStartDraft(false)}>
          <Plus className="mr-2 size-4" />
          {t('actions.create')}
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => onStartDraft(true)}>
          <FolderPlus className="mr-2 size-4" />
          {t('actions.newFolder')}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
