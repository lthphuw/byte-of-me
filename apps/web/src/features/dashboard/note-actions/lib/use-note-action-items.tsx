'use client';

import { useIsMutating, useMutationState } from '@tanstack/react-query';
import {
  Archive,
  ArchiveRestore,
  FilePlus,
  FolderPlus,
  Pencil,
  Pin,
  PinOff,
  Share2,
  Trash2,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

import {
  ARCHIVE_NOTE_MUTATION_KEY,
  CREATE_NOTE_MUTATION_KEY,
  PIN_NOTE_MUTATION_KEY,
  RESTORE_NOTE_MUTATION_KEY,
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
  /** Opens the share dialog, which the caller owns for the same reason. */
  onRequestShare: () => void;
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
  onRequestShare,
  onRenameRequested,
}: NoteActionsTarget): NoteActionItem[] {
  const t = useTranslations('dashboard.note');
  // `remove` is deliberately not taken: the permanent delete runs from the
  // confirmation dialog, which outlives this menu.
  const { archive, restore, pin } = useNoteMutations({ onRemoved });
  const createInside = useCreateNote(onCreatedInside);

  /**
   * Whether a create is already running — read from the MUTATION CACHE, not
   * from `createInside.isPending`.
   *
   * `isPending` cannot work here and never did: Radix unmounts this menu's
   * content the moment an item is chosen, so the re-render that would turn the
   * flag on is never committed and the item is only ever rendered enabled.
   * Reopening the menu mid-create therefore offered "New note inside" again,
   * and taking it created a second note and fired a second `router.push` on
   * top of the first — the double-navigation shape `note-row-input.tsx`
   * already records as having left the editor showing a skeleton.
   *
   * The cache outlives the observer, which is the same reason
   * `note-tree-panel.tsx` reads its pending rows from here.
   */
  const pendingCreates = useMutationState({
    filters: { mutationKey: CREATE_NOTE_MUTATION_KEY, status: 'pending' },
    select: (mutation) => mutation.mutationId,
  });
  const isCreating = pendingCreates.length > 0;

  /**
   * The same question for the other three, and it had the same wrong answer.
   *
   * `pin.isPending`, `archive.isPending` and `restore.isPending` were all
   * unreachable for exactly the reason spelled out above: the observer they
   * live on is unmounted with the menu content, one render before the flag
   * could turn on, so the item was only ever rendered enabled and reopening
   * the menu offered the action again. On `archive` that is not cosmetic —
   * archiving cascades, so a second take re-archives a whole subtree that is
   * already on its way to the trash.
   *
   * `useIsMutating` rather than `useMutationState`: it asks the cache the same
   * question and returns a count, with no `select` to write. It counts pending
   * mutations only, which is what "still running" means here.
   */
  const isPinning = useIsMutating({ mutationKey: PIN_NOTE_MUTATION_KEY }) > 0;
  const isArchiving =
    useIsMutating({ mutationKey: ARCHIVE_NOTE_MUTATION_KEY }) > 0;
  const isRestoring =
    useIsMutating({ mutationKey: RESTORE_NOTE_MUTATION_KEY }) > 0;

  const items: NoteActionItem[] = [];

  // Create-inside for live rows: any row can hold children (the tree is one
  // hierarchy), but folders are where it matters.
  if (!isArchived) {
    items.push(
      {
        id: 'new-note-inside',
        icon: <FilePlus className="mr-2 size-4" />,
        label: t('actions.newNoteInside'),
        disabled: isCreating,
        onSelect: () => createInside.mutate({ parentId: noteId }),
      },
      {
        id: 'new-folder-inside',
        icon: <FolderPlus className="mr-2 size-4" />,
        label: t('actions.newFolderInside'),
        disabled: isCreating,
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

    // Live rows only. An archived note is in the trash and `resolveNoteAccess`
    // refuses it anyway, so offering to share one would open a dialog whose
    // invitations lead nowhere until it is restored.
    items.push({
      id: 'share',
      icon: <Share2 className="mr-2 size-4" />,
      label: t('actions.share'),
      separatorBefore: true,
      // Opened by the CALLER, from state that outlives this menu — see the
      // delete item below for why a dialog mounted inside a closing Radix menu
      // loses its focus trap.
      onSelect: onRequestShare,
    });

    items.push({
      id: 'pin',
      icon: isPinned ? (
        <PinOff className="mr-2 size-4" />
      ) : (
        <Pin className="mr-2 size-4" />
      ),
      label: isPinned ? t('actions.unpin') : t('actions.pin'),
      separatorBefore: true,
      disabled: isPinning,
      onSelect: () => pin.mutate({ id: noteId, isPinned: !isPinned }),
    });
  }

  items.push(
    isArchived
      ? {
          id: 'restore',
          icon: <ArchiveRestore className="mr-2 size-4" />,
          label: t('actions.restore'),
          disabled: isRestoring,
          onSelect: () => restore.mutate(noteId),
        }
      : {
          id: 'archive',
          icon: <Archive className="mr-2 size-4" />,
          label: t('actions.archive'),
          disabled: isArchiving,
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
