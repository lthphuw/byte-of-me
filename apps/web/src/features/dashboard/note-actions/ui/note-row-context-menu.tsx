'use client';

import { useRef, useState } from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
  useMediaQuery,
} from '@byte-of-me/ui';

import type { NoteActionsTarget } from '@/features/dashboard/note-actions/lib/use-note-action-items';
import { DeleteNoteDialog } from '@/features/dashboard/note-actions/ui/delete-note-dialog';
import { NoteMenuItems } from '@/features/dashboard/note-actions/ui/note-menu-items';
import { ShareNoteDialog } from '@/features/dashboard/note-actions/ui/share-note-dialog';
import { isModalOpen } from '@/shared/lib/is-modal-open';

type NoteRowContextMenuProps = Omit<
  NoteActionsTarget,
  'onRequestDelete' | 'onRequestShare' | 'onRenameRequested'
> & {
  title: string;
  /** Changes the share dialog's wording; a folder grant covers its subtree. */
  isFolder: boolean;
  children: React.ReactNode;
};

/**
 * The same menu, opened by right-clicking the row it wraps.
 *
 * A wrapper rather than a second button: the trigger has to be the whole row,
 * which this component does not own and cannot reach into.
 *
 * DISABLED ON TOUCH, deliberately. Radix opens a context menu on a long press,
 * and the explorer's `TouchSensor` already claims that gesture at 200ms to
 * start a drag (`use-note-dnd.ts`). Two handlers on one gesture is not a
 * near-miss to tune — the drag wins every time, so on a phone the long press
 * dragged the note the author was trying to open a menu for. Touch keeps the
 * drag; its menu is the `⋮` button, which is permanently visible on touch for
 * exactly this reason.
 */
export function NoteRowContextMenu({
  title,
  isFolder,
  children,
  ...target
}: NoteRowContextMenuProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const renameRequested = useRef(false);
  // `(pointer: coarse)` rather than a width breakpoint: what matters is the
  // input device, not the screen. A tablet with a mouse should keep the menu; a
  // large phone should not.
  const isTouch = useMediaQuery('(pointer: coarse)');

  if (isTouch) return <>{children}</>;

  return (
    <>
      <ContextMenu>
        {/*
          `onContextMenu` is intercepted rather than left to Radix, for the
          same invariant `isModalOpen` was written for: a dialog owns the
          input while it is open. Observed — with the share dialog open, a
          right-click ANYWHERE on the page (the editor pane, the empty space
          beside it) reopened this row's menu on top of the dialog, offering
          Archive and Delete for a note the author was not even looking at.
          Radix's own dismissable layer does not cover the context menu here.
        */}
        <ContextMenuTrigger
          asChild
          onContextMenu={(event) => {
            if (isModalOpen()) event.preventDefault();
          }}
        >
          {children}
        </ContextMenuTrigger>
        <ContextMenuContent
          className="w-48"
          // See `NoteActionsMenu` for why a rename has to suppress the focus
          // return.
          onCloseAutoFocus={(event) => {
            if (!renameRequested.current) return;
            renameRequested.current = false;
            event.preventDefault();
          }}
        >
          <NoteMenuItems
            {...target}
            Item={ContextMenuItem}
            Separator={ContextMenuSeparator}
            onRequestDelete={() => setConfirmOpen(true)}
            onRequestShare={() => setShareOpen(true)}
            onRenameRequested={() => {
              renameRequested.current = true;
            }}
          />
        </ContextMenuContent>
      </ContextMenu>

      <DeleteNoteDialog
        noteId={target.noteId}
        title={title}
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onRemoved={target.onRemoved}
      />

      <ShareNoteDialog
        noteId={target.noteId}
        title={title}
        isFolder={isFolder}
        open={shareOpen}
        onOpenChange={setShareOpen}
      />
    </>
  );
}
