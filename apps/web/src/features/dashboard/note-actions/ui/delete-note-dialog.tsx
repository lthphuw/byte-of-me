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

import { getDescendantCount, noteKeys } from '@/entities/note';
import { getNoteShareExposure, noteShareKeys } from '@/entities/note-share';
import { useNoteMutations } from '@/features/dashboard/note-actions/lib/use-note-mutations';

interface DeleteNoteDialogProps {
  noteId: string;
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRemoved?: (noteId: string) => void;
}

/**
 * The permanent-delete confirmation, and the cascade count it needs to be
 * honest.
 *
 * Both the count query and the delete mutation live here rather than in the
 * menu, which means they exist only while this dialog is open. That replaced a
 * whole apparatus: the count used to be fetched at ROW level, guarded by an
 * `armed` flag flipped from `onPointerDownCapture`/`onFocusCapture` on a
 * `display: contents` wrapper, purely so that mounting the menu for every
 * visible row did not fire one request per row. Mounting the query where it is
 * actually read makes all of that unnecessary.
 */
export function DeleteNoteDialog({
  noteId,
  title,
  open,
  onOpenChange,
  onRemoved,
}: DeleteNoteDialogProps) {
  const t = useTranslations('dashboard.note');
  const { remove } = useNoteMutations({ onRemoved });

  const { data: descendantCount } = useQuery({
    queryKey: noteKeys.descendantCount(noteId),
    queryFn: async () => {
      const res = await getDescendantCount(noteId);
      if (!res.success) throw new Error(res.errorMsg);
      return res.data;
    },
    enabled: open,
    // Overrides the client's global 60s. This number is the sentence "and its
    // N nested notes" in a PERMANENT-DELETE confirmation, and a cached one
    // understates what is about to be destroyed: open the dialog, cancel, add
    // two notes to that folder, reopen inside the window, and the author is
    // told 3 while 5 are deleted. Always ask.
    staleTime: 0,
  });

  const { data: exposure } = useQuery({
    queryKey: noteShareKeys.exposure(noteId),
    queryFn: async () => {
      const res = await getNoteShareExposure(noteId);
      if (!res.success) throw new Error(res.errorMsg);
      return res.data;
    },
    enabled: open,
    // Same reasoning as the count above, and for the same reason it matters
    // more here than anywhere else: this sentence says whose access is about
    // to disappear, and a cached one that understates it is wrong in the
    // direction that costs somebody their document.
    staleTime: 0,
  });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('delete.title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {/* Before the count lands the wording is the plain single-note one,
                and it swaps when the query resolves. That window is one round
                trip beginning as the dialog opens, while the author still has
                to cross to the destructive button; blocking the dialog on a
                fetch would put a spinner inside the very confirmation that
                exists to slow this down. */}
            {descendantCount && descendantCount > 0
              ? t('delete.descriptionWithChildren', {
                  title,
                  count: descendantCount,
                })
              : t('delete.description', { title })}
          </AlertDialogDescription>

          {/* A sibling of the description, not a child of it:
              `AlertDialogDescription` renders a <p>, and a second block
              element inside one is invalid HTML that React will reparent. */}
          {exposure && exposure.shareCount > 0 ? (
            <p className="text-sm text-destructive">
              {t('delete.descriptionShared', { count: exposure.shareCount })}
            </p>
          ) : null}
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
}
