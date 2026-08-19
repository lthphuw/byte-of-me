'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

import { getNoteAncestors, noteKeys } from '@/entities/note';

interface RevealActiveNoteProps {
  noteId: string;
  onReveal: (id: string, ancestorIds: readonly string[]) => void;
}

/**
 * Opens the tree onto a note that is nowhere on screen.
 *
 * That is the ordinary case for anything opened from outside the tree — the
 * command palette, a `[[` link, or a reload straight onto a note buried in
 * folders that all start collapsed. Before this existed the explorer said
 * nothing at all about where the open note lived.
 *
 * A component with a non-null `noteId` rather than a hook with a placeholder
 * key plus `enabled`, which would park a cache entry under an id that does not
 * exist. The caller mounts it only while a reveal is outstanding.
 *
 * It renders nothing. All it does is turn an ancestor chain into expanded
 * folders and a selection; the ROW handles scrolling, on mount, when it sees
 * its own id in `revealId` — see `NoteExplorerControls`. That is also what
 * stops this from looping: `data` keeps its identity across the renders while
 * the newly expanded levels load, so the effect below does not re-fire.
 */
export function RevealActiveNote({ noteId, onReveal }: RevealActiveNoteProps) {
  const { data } = useQuery({
    queryKey: noteKeys.ancestors(noteId),
    queryFn: async () => {
      const res = await getNoteAncestors(noteId);
      if (!res.success) throw new Error(res.errorMsg);
      return res.data;
    },
  });

  useEffect(() => {
    if (!data) return;
    onReveal(
      noteId,
      data.map((ancestor) => ancestor.id)
    );
  }, [data, noteId, onReveal]);

  // A failed lookup is deliberately silent: the note is open and readable, the
  // tree just does not scroll to it. Interrupting the author with a toast about
  // a navigational nicety would be the louder bug.
  return null;
}
