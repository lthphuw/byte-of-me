'use client';

import { useRef, useState } from 'react';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@byte-of-me/ui';
import { MoreVertical } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { NoteActionsTarget } from '@/features/dashboard/note-actions/lib/use-note-action-items';
import { DeleteNoteDialog } from '@/features/dashboard/note-actions/ui/delete-note-dialog';
import { NoteMenuItems } from '@/features/dashboard/note-actions/ui/note-menu-items';
import { cn } from '@/shared/lib/utils';

export type NoteActionsMenuProps = Omit<
  NoteActionsTarget,
  'onRequestDelete' | 'onRenameRequested'
> & {
  /** Shown in the delete confirmation. */
  title: string;
  className?: string;
};

/**
 * The `⋮` button and its dropdown.
 *
 * Holds only what has to outlive the menu: whether the delete confirmation is
 * open, and the one-shot flag that stops Radix's focus return from killing an
 * in-place rename. Everything else — the item list and every mutation behind it
 * — lives inside `DropdownMenuContent`, which Radix mounts only while the menu
 * is open. A closed menu therefore costs one button.
 */
export function NoteActionsMenu({
  title,
  className,
  ...target
}: NoteActionsMenuProps) {
  const t = useTranslations('dashboard.note');
  const [confirmOpen, setConfirmOpen] = useState(false);

  /**
   * Set for exactly one close, by the rename item.
   *
   * Radix returns focus to the trigger when a menu closes. Rename turns the row
   * BEHIND that trigger into a text input which focuses itself on mount — so
   * the focus return lands a fraction later, blurs the input, and the blur
   * commits and closes it. Observed in the browser as "Rename does nothing":
   * the input mounted and vanished inside the same frame.
   */
  const renameRequested = useRef(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            tabIndex={-1}
            aria-label={t('tree.actionsAriaLabel')}
            // `stopPropagation`: in the tree this button sits inside the row
            // that selects a note, and opening the menu must not also open the
            // note behind it.
            onClick={(event) => event.stopPropagation()}
            className={cn('size-7 shrink-0', className)}
          >
            <MoreVertical className="size-4" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          className="w-48"
          onCloseAutoFocus={(event) => {
            if (!renameRequested.current) return;
            renameRequested.current = false;
            event.preventDefault();
          }}
        >
          <NoteMenuItems
            {...target}
            Item={DropdownMenuItem}
            Separator={DropdownMenuSeparator}
            onRequestDelete={() => setConfirmOpen(true)}
            onRenameRequested={() => {
              renameRequested.current = true;
            }}
          />
        </DropdownMenuContent>
      </DropdownMenu>

      <DeleteNoteDialog
        noteId={target.noteId}
        title={title}
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onRemoved={target.onRemoved}
      />
    </>
  );
}
