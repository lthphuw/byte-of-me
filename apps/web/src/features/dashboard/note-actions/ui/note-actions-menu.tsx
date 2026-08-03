'use client';

import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@byte-of-me/ui';
import { Archive, ArchiveRestore, MoreVertical, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useNoteMutations } from '@/features/dashboard/note-actions/lib/use-note-mutations';
import { cn } from '@/shared/lib/utils';

interface NoteActionsMenuProps {
  noteId: string;
  title: string;
  isArchived: boolean;
  /**
   * How many notes hang below this one. Only used in the delete confirmation,
   * where it is the difference between "delete this note" and "delete this
   * note and the eleven under it" — the database cascade takes them either
   * way, so the author has to be told before, not after.
   */
  descendantCount: number;
  onRemoved?: (noteId: string) => void;
  className?: string;
}

export function NoteActionsMenu({
  noteId,
  title,
  isArchived,
  descendantCount,
  onRemoved,
  className,
}: NoteActionsMenuProps) {
  const t = useTranslations('dashboard.note');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { archive, restore, remove } = useNoteMutations({ onRemoved });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
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

        <DropdownMenuContent align="end" className="w-48">
          {isArchived ? (
            <DropdownMenuItem
              disabled={restore.isPending}
              onSelect={() => restore.mutate(noteId)}
            >
              <ArchiveRestore className="mr-2 size-4" />
              {t('actions.restore')}
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              disabled={archive.isPending}
              onSelect={() => archive.mutate(noteId)}
            >
              <Archive className="mr-2 size-4" />
              {t('actions.archive')}
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            // The dialog is opened from the menu's `onSelect` rather than
            // nesting an `AlertDialogTrigger` inside the item: radix closes
            // the menu and returns focus on select, and a dialog mounted
            // inside the closing menu loses its focus trap to that same
            // handoff. Opening it from state, as a sibling, keeps the two
            // overlays independent.
            onSelect={() => setConfirmOpen(true)}
          >
            <Trash2 className="mr-2 size-4" />
            {t('actions.deleteForever')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('delete.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {descendantCount > 0
                ? t('delete.descriptionWithChildren', {
                    title,
                    count: descendantCount,
                  })
                : t('delete.description', { title })}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>{t('delete.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              disabled={remove.isPending}
              onClick={() => remove.mutate(noteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('delete.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
