'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import { getAdminNoteById, noteKeys } from '@/entities/note';
import { NoteActionsMenu } from '@/features/dashboard/note-actions';

interface NoteEditorActionsProps {
  noteId: string;
  onCreatedInside: (noteId: string) => void;
  onRemoved: () => void;
}

/**
 * The editor header's actions menu, for whichever note is open.
 *
 * The three things the menu needs about that note — title, archived, pinned —
 * all live on `NoteDetail`, and the editor mounted directly below has
 * `noteKeys.detail(noteId)` open anyway, so reading the same key with the same
 * `queryFn` costs nothing: TanStack serves both subscribers from the one fetch.
 * They used to be found by scanning a whole-corpus tree result for the one
 * matching row, which was the expensive way round.
 *
 * No `onRename` is passed. Rename here would mean an in-place edit in a tree
 * this note may not even be visible in; the editor's own title field is the
 * rename, and the menu simply omits the item.
 */
export function NoteEditorActions({
  noteId,
  onCreatedInside,
  onRemoved,
}: NoteEditorActionsProps) {
  const t = useTranslations('dashboard.note');

  const { data: note } = useQuery({
    queryKey: noteKeys.detail(noteId),
    queryFn: async () => {
      const res = await getAdminNoteById(noteId);
      if (!res.success) throw new Error(res.errorMsg);
      return res.data;
    },
  });

  return (
    <NoteActionsMenu
      noteId={noteId}
      title={note?.title ?? t('untitled')}
      isFolder={note?.isFolder ?? false}
      isArchived={note?.archivedAt != null}
      isPinned={note?.isPinned ?? false}
      onCreatedInside={onCreatedInside}
      onRemoved={onRemoved}
    />
  );
}
