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
import { useTranslations } from 'next-intl';

import { getDescendantCount, noteKeys,type NoteTreeNode } from '@/entities/note';

interface ArchiveNoteDialogProps {
  /** The row awaiting confirmation, or null when nothing is pending. */
  node: NoteTreeNode | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (noteId: string) => void;
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
 */
export function ArchiveNoteDialog({
  node,
  onOpenChange,
  onConfirm,
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
          <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
          <AlertDialogAction onClick={() => node && onConfirm(node.id)}>
            {t('confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
