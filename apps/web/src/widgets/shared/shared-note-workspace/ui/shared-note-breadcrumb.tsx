'use client';

import { useQuery } from '@tanstack/react-query';
import { ChevronRight } from 'lucide-react';

import {
  getSharedNoteAncestors,
  noteShareKeys,
  sharedNoteHref,
} from '@/entities/note-share';
import { Link } from '@/shared/i18n/navigation';

/**
 * The path from the share root down to the open note.
 *
 * The chain arrives already bounded — `getSharedNoteAncestors` stops the walk
 * at the share root server-side. Nothing is truncated here and nothing is
 * prepended: a crumb this component invented would be a folder name the
 * server deliberately withheld.
 */
export function SharedNoteBreadcrumb({ noteId }: { noteId: string }) {
  const ancestors = useQuery({
    queryKey: noteShareKeys.ancestors(noteId),
    queryFn: async () => {
      const res = await getSharedNoteAncestors(noteId);
      if (!res.success) throw new Error(res.errorMsg);
      return res.data;
    },
  });

  if (!ancestors.data?.length) {
    return null;
  }

  return (
    <nav className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
      {ancestors.data.map((rung, index) => (
        <span key={rung.id} className="flex items-center gap-1">
          {index > 0 ? <ChevronRight className="size-3" /> : null}
          <Link
            href={sharedNoteHref(rung.id)}
            className="max-w-40 truncate transition-colors hover:text-foreground"
          >
            {rung.title}
          </Link>
        </span>
      ))}
    </nav>
  );
}
