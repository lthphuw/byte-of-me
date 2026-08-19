'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@byte-of-me/ui';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { getDescendantCount, noteKeys,type NoteTreeNode } from '@/entities/note';

interface ArchiveNoteDialogProps {
  /** The row awaiting confirmation, or null when nothing is pending. */
  node: NoteTreeNode | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (noteId: string) => void;
  /**
   * Whether the caller's archive mutation is in flight.
   *
   * Optional so the existing call site keeps compiling (AGENTS §11.6), but a
   * caller that does not pass it gets no pending affordance at all — this
   * dialog does not own the mutation, so it cannot derive the state itself.
   */
  isPending?: boolean;
}

/**
 * The confirmation Delete/Backspace now goes through.
 *
 * Archiving used to run straight off the keystroke, on the grounds that it is
 * reversible. Reversible is not the same as small: the mutation cascades, so
 * one keypress on a folder archived the folder and everything beneath it, and
 * the only signal was a toast that named neither. This says how many notes are
 * about to move before it happens.
 *
 * The count is fetched here rather than read off the row for the reason
 * `DeleteNoteDialog` records: a collapsed folder's subtree was never loaded,
 * so the row cannot know its own size.
 *
 * Unlike `DeleteNoteDialog` this one does NOT own its mutation — the tree panel
 * runs the archive so it can also move its own selection. The consequence is
 * that dismissal is the caller's to time: this dialog never closes itself (see
 * the `preventDefault` below), so a caller that closes on the click rather than
 * on success is back to a cascading archive with no confirmation on screen.
 */
export function ArchiveNoteDialog({
  node,
  onOpenChange,
  onConfirm,
  isPending,
}: ArchiveNoteDialogProps) {
  const t = useTranslations('dashboard.note.archiveConfirm');
  const open = node !== null;

  const { data: descendantCount } = useQuery({
    queryKey: noteKeys.descendantCount(node?.id ?? ''),
    queryFn: async () => {
      const res = await getDescendantCount(node?.id ?? '');
      if (!res.success) throw new Error(res.errorMsg);
      return res.data;
    },
    enabled: open,
    // Always ask, for the reason DeleteNoteDialog gives: a cached count
    // understates what is about to move, and understating the blast radius is
    // the wrong direction to be wrong in.
    staleTime: 0,
  });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t('title', { title: node?.title ?? '' })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {descendantCount && descendantCount > 0
              ? t('descriptionWithChildren', { count: descendantCount })
              : t('description')}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>
            {t('cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            // `AlertDialogAction` IS `DialogPrimitive.Close`, and Radix composes
            // this handler with `onOpenChange(false)` through
            // `composeEventHandlers`, which honours `defaultPrevented`. Without
            // this call the confirmation is off screen before the subtree-wide
            // archive has even been dispatched, and the `disabled` above can
            // never paint. Same shape as `ConfirmDeleteDialog` in `packages/ui`
            // and `DeleteNoteDialog` next door.
            onClick={(e) => {
              e.preventDefault();
              if (node) onConfirm(node.id);
            }}
          >
            {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}{' '}
            {t('confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
