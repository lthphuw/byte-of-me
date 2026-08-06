'use client';

import { Fragment, useRef, useState } from 'react';
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
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
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
} from '@/features/dashboard/note-actions/lib/use-note-mutations';
import { cn } from '@/shared/lib/utils';

/**
 * One entry in the note menu, described rather than rendered.
 *
 * The same list has to appear in two places — the `⋮` dropdown and the
 * right-click menu — and Radix gives them different item components. Describing
 * the entries once and letting each surface render them is what keeps the two
 * from drifting; two hand-maintained copies of this list is precisely the
 * duplication AGENTS §11.3 calls a bug even when both copies work.
 */
interface NoteActionItem {
  id: string;
  icon: React.ReactNode;
  label: string;
  /** Renders a separator ABOVE this item. */
  separatorBefore?: boolean;
  destructive?: boolean;
  disabled?: boolean;
  onSelect: () => void;
}

interface NoteActionsProps {
  noteId: string;
  title: string;
  isArchived: boolean;
  isPinned: boolean;
  /** Opens a note created INSIDE this one ("New note inside"). */
  onCreatedInside?: (noteId: string) => void;
  /**
   * Starts an in-place rename in the tree. Optional: the editor header mounts
   * this menu too, and there the title field IS the rename, so the item is
   * simply absent rather than opening a dialog over the editor.
   */
  onRename?: (noteId: string) => void;
  /**
   * How many notes hang below this one. Only used in the delete confirmation,
   * where it is the difference between "delete this note" and "delete this
   * note and the eleven under it" — the database cascade takes them either
   * way, so the author has to be told before, not after.
   */
  descendantCount: number;
  onRemoved?: (noteId: string) => void;
}

/**
 * The menu's entries and its confirmation dialog, built once for both surfaces.
 *
 * Returns the dialog as a node rather than letting each surface build its own:
 * the confirmation is the one piece with real state, and duplicating it would
 * mean two dialogs disagreeing about what is being deleted.
 */
function useNoteActions({
  noteId,
  title,
  isArchived,
  isPinned,
  onCreatedInside,
  onRename,
  descendantCount,
  onRemoved,
}: NoteActionsProps) {
  const t = useTranslations('dashboard.note');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { archive, restore, remove, pin } = useNoteMutations({ onRemoved });
  const createInside = useCreateNote(onCreatedInside);
  /**
   * Set for exactly one close, by the rename item.
   *
   * Radix returns focus to the trigger when a menu closes. The rename item
   * turns the row BEHIND that trigger into a text input which focuses itself on
   * mount — so the focus return lands a fraction later, blurs the input, and
   * the blur commits and closes it. Observed in the browser as "Rename does
   * nothing": the input mounted and vanished inside the same frame.
   *
   * `onCloseAutoFocus` is the documented escape hatch, and it is scoped to this
   * one item: every other close still restores focus to the row, which is where
   * a keyboard user needs it.
   */
  const renameRequested = useRef(false);

  const items: NoteActionItem[] = [];

  // Create-inside for live rows: any row can hold children (the tree is one
  // hierarchy), but folders are where it matters.
  if (!isArchived) {
    items.push(
      {
        id: 'new-note-inside',
        icon: <FilePlus className="mr-2 size-4" />,
        label: t('actions.newNoteInside'),
        disabled: createInside.isPending,
        onSelect: () => createInside.mutate({ parentId: noteId }),
      },
      {
        id: 'new-folder-inside',
        icon: <FolderPlus className="mr-2 size-4" />,
        label: t('actions.newFolderInside'),
        disabled: createInside.isPending,
        onSelect: () =>
          createInside.mutate({ parentId: noteId, isFolder: true }),
      }
    );

    // Rename is now in-place in the tree, and it covers NOTES as well as
    // folders. It used to be a dialog that only folders had, so renaming a note
    // meant opening it in the editor first — which is why `isFolder` is no
    // longer a prop here at all: nothing in this menu depends on it any more.
    if (onRename) {
      items.push({
        id: 'rename',
        icon: <Pencil className="mr-2 size-4" />,
        label: t('actions.rename'),
        onSelect: () => {
          renameRequested.current = true;
          onRename(noteId);
        },
      });
    }

    items.push({
      id: 'pin',
      icon: isPinned ? (
        <PinOff className="mr-2 size-4" />
      ) : (
        <Pin className="mr-2 size-4" />
      ),
      label: isPinned ? t('actions.unpin') : t('actions.pin'),
      separatorBefore: true,
      disabled: pin.isPending,
      onSelect: () => pin.mutate({ id: noteId, isPinned: !isPinned }),
    });
  }

  items.push(
    isArchived
      ? {
          id: 'restore',
          icon: <ArchiveRestore className="mr-2 size-4" />,
          label: t('actions.restore'),
          disabled: restore.isPending,
          onSelect: () => restore.mutate(noteId),
        }
      : {
          id: 'archive',
          icon: <Archive className="mr-2 size-4" />,
          label: t('actions.archive'),
          disabled: archive.isPending,
          onSelect: () => archive.mutate(noteId),
        }
  );

  items.push({
    id: 'delete',
    icon: <Trash2 className="mr-2 size-4" />,
    label: t('actions.deleteForever'),
    separatorBefore: true,
    destructive: true,
    // The dialog is opened from the menu's `onSelect` rather than nesting an
    // `AlertDialogTrigger` inside the item: radix closes the menu and returns
    // focus on select, and a dialog mounted inside the closing menu loses its
    // focus trap to that same handoff. Opening it from state, as a sibling,
    // keeps the two overlays independent.
    onSelect: () => setConfirmOpen(true),
  });

  const dialog = (
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
  );

  /** Spread onto whichever menu content renders `items`. */
  const contentProps = {
    onCloseAutoFocus: (event: Event) => {
      if (!renameRequested.current) return;
      renameRequested.current = false;
      event.preventDefault();
    },
  };

  return { items, dialog, contentProps };
}

/** The `⋮` button and its dropdown. */
export function NoteActionsMenu({
  className,
  ...props
}: NoteActionsProps & { className?: string }) {
  const t = useTranslations('dashboard.note');
  const { items, dialog, contentProps } = useNoteActions(props);

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

        <DropdownMenuContent align="end" className="w-48" {...contentProps}>
          {items.map((item) => (
            <Fragment key={item.id}>
              {item.separatorBefore && <DropdownMenuSeparator />}
              <DropdownMenuItem
                disabled={item.disabled}
                onSelect={item.onSelect}
                className={cn(
                  item.destructive && 'text-destructive focus:text-destructive'
                )}
              >
                {item.icon}
                {item.label}
              </DropdownMenuItem>
            </Fragment>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {dialog}
    </>
  );
}

/**
 * The same menu, opened by right-clicking the row it wraps.
 *
 * A wrapper rather than a second menu button: the trigger has to be the whole
 * row, which is a thing this component does not own and cannot reach into.
 */
export function NoteRowContextMenu({
  children,
  ...props
}: NoteActionsProps & { children: React.ReactNode }) {
  const { items, dialog, contentProps } = useNoteActions(props);

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
        <ContextMenuContent className="w-48" {...contentProps}>
          {items.map((item) => (
            <Fragment key={item.id}>
              {item.separatorBefore && <ContextMenuSeparator />}
              <ContextMenuItem
                disabled={item.disabled}
                onSelect={item.onSelect}
                className={cn(
                  item.destructive && 'text-destructive focus:text-destructive'
                )}
              >
                {item.icon}
                {item.label}
              </ContextMenuItem>
            </Fragment>
          ))}
        </ContextMenuContent>
      </ContextMenu>

      {dialog}
    </>
  );
}
