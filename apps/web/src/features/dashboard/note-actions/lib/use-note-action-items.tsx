'use client';

import {
  Archive,
  ArchiveRestore,
  FilePlus,
  FolderPlus,
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

/**
 * One entry in the note menu, described rather than rendered.
 *
 * The same list appears on two surfaces — the `⋮` dropdown and the right-click
 * menu — and Radix gives each its own item component. Describing the entries
 * once and letting each surface render them is what keeps the two from
 * drifting; two hand-maintained copies is the duplication AGENTS §11.3 calls a
 * bug even when both copies work.
 */
export interface NoteActionItem {
  id: string;
  icon: React.ReactNode;
  label: string;
  /** Renders a separator ABOVE this item. */
  separatorBefore?: boolean;
  destructive?: boolean;
  disabled?: boolean;
  onSelect: () => void;
}

export interface NoteActionsTarget {
  noteId: string;
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
  onRemoved?: (noteId: string) => void;
  /** Opens the permanent-delete confirmation, which the caller owns. */
  onRequestDelete: () => void;
  /** Called when the rename item is chosen, before `onRename`. */
  onRenameRequested?: () => void;
}

/**
 * The menu's entries, and the mutations behind them.
 *
 * This hook is deliberately called from INSIDE a Radix menu's content, which
 * Radix only mounts while the menu is open. Every row in the tree renders two
 * menu surfaces, so calling it at row level meant each row mounted five
 * mutations twice over — ten `useMutation` instances per row, four hundred in a
 * forty-row tree, for menus nobody had opened. Mounting them with the content
 * costs nothing until someone actually reaches for a menu.
 */
export function useNoteActionItems({
  noteId,
  isArchived,
  isPinned,
  onCreatedInside,
  onRename,
  onRemoved,
  onRequestDelete,
  onRenameRequested,
}: NoteActionsTarget): NoteActionItem[] {
  const t = useTranslations('dashboard.note');
  // `remove` is deliberately not taken: the permanent delete runs from the
  // confirmation dialog, which outlives this menu.
  const { archive, restore, pin } = useNoteMutations({ onRemoved });
  const createInside = useCreateNote(onCreatedInside);

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

    // Rename is in-place in the tree now, and it covers NOTES as well as
    // folders. It used to be a dialog that only folders had, so renaming a note
    // meant opening it in the editor first.
    if (onRename) {
      items.push({
        id: 'rename',
        icon: <Pencil className="mr-2 size-4" />,
        label: t('actions.rename'),
        onSelect: () => {
          onRenameRequested?.();
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
    // The confirmation is opened by the CALLER, from state that outlives this
    // menu. Radix closes the menu and returns focus on select, and a dialog
    // mounted inside the closing menu loses its focus trap to that same
    // handoff — which is also why the delete mutation lives in the dialog
    // rather than here.
    onSelect: onRequestDelete,
  });

  return items;
}
