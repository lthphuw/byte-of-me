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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
} from '@byte-of-me/ui';
import {
  Archive,
  ArchiveRestore,
  FilePlus,
  FolderPlus,
  MoreVertical,
  Pencil,
  Pin,
  PinOff,
  Trash2,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

import {
  useCreateNote,
  useNoteMutations,
  useRenameNote,
} from '@/features/dashboard/note-actions/lib/use-note-mutations';
import { cn } from '@/shared/lib/utils';

interface NoteActionsMenuProps {
  noteId: string;
  title: string;
  isArchived: boolean;
  isPinned: boolean;
  /** Folders get rename + create-inside items; the row itself never opens. */
  isFolder?: boolean;
  /** Opens a note created INSIDE this one ("New note inside"). */
  onCreatedInside?: (noteId: string) => void;
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
  isPinned,
  isFolder = false,
  onCreatedInside,
  descendantCount,
  onRemoved,
  className,
}: NoteActionsMenuProps) {
  const t = useTranslations('dashboard.note');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState(title);
  const { archive, restore, remove, pin } = useNoteMutations({ onRemoved });
  const createInside = useCreateNote(onCreatedInside);
  const rename = useRenameNote();

  const commitRename = () => {
    const next = renameValue.trim();
    if (next && next !== title) {
      rename.mutate({ id: noteId, title: next });
    }
    setRenameOpen(false);
  };

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
          {/* Create-inside for live rows: any row can hold children (the
              tree is one hierarchy), but folders are where it matters. */}
          {!isArchived && (
            <>
              <DropdownMenuItem
                disabled={createInside.isPending}
                onSelect={() => createInside.mutate({ parentId: noteId })}
              >
                <FilePlus className="mr-2 size-4" />
                {t('actions.newNoteInside')}
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={createInside.isPending}
                onSelect={() =>
                  createInside.mutate({ parentId: noteId, isFolder: true })
                }
              >
                <FolderPlus className="mr-2 size-4" />
                {t('actions.newFolderInside')}
              </DropdownMenuItem>
              {/* Folders never open an editor, so this is their only rename
                  path; notes rename through the editor title. */}
              {isFolder && (
                <DropdownMenuItem
                  onSelect={() => {
                    setRenameValue(title);
                    setRenameOpen(true);
                  }}
                >
                  <Pencil className="mr-2 size-4" />
                  {t('actions.rename')}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
            </>
          )}

          {/* Pinning an archived note is meaningless — the trash view does
              not honour pin order — so the item only shows for live notes. */}
          {!isArchived && (
            <DropdownMenuItem
              disabled={pin.isPending}
              onSelect={() => pin.mutate({ id: noteId, isPinned: !isPinned })}
            >
              {isPinned ? (
                <PinOff className="mr-2 size-4" />
              ) : (
                <Pin className="mr-2 size-4" />
              )}
              {isPinned ? t('actions.unpin') : t('actions.pin')}
            </DropdownMenuItem>
          )}

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

      {/* Rename, opened from state like the delete confirmation above and
          for the same radix focus-handoff reason. */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('rename.title')}</DialogTitle>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(event) => setRenameValue(event.target.value)}
            aria-label={t('rename.label')}
            maxLength={200}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                commitRename();
              }
            }}
          />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setRenameOpen(false)}
            >
              {t('rename.cancel')}
            </Button>
            <Button
              type="button"
              disabled={rename.isPending || renameValue.trim() === ''}
              onClick={commitRename}
            >
              {t('rename.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
