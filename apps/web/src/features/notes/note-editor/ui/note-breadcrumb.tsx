'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import {
  getNoteAncestors,
  NOTE_CRUMB_CLASS,
  NoteBreadcrumbTrail,
  noteKeys,
} from '@/entities/note';

interface NoteBreadcrumbProps {
  noteId: string;
  /** Selects and expands that folder in the tree. */
  onOpenFolder?: (folderId: string) => void;
}

/**
 * Where the open note lives, above its title.
 *
 * Reads the same `noteKeys.ancestors(noteId)` entry the tree's reveal uses, so
 * opening a note from the command palette costs one lookup rather than two —
 * TanStack serves both subscribers from the one fetch.
 *
 * Renders nothing at all for a root-level note. An empty crumb bar would be a
 * row of padding saying "this note is not anywhere", and most notes in a young
 * workspace are at the root.
 *
 * `BreadcrumbSeparator` is an `<li>`, like `BreadcrumbItem` — so separators are
 * SIBLINGS of the items, never nested inside them. Nesting them produced `<li>`
 * inside `<li>` and a React key warning pointing here.
 */
export function NoteBreadcrumb({ noteId, onOpenFolder }: NoteBreadcrumbProps) {
  const t = useTranslations('dashboard.note');

  const { data: ancestors } = useQuery({
    queryKey: noteKeys.ancestors(noteId),
    queryFn: async () => {
      const res = await getNoteAncestors(noteId);
      if (!res.success) throw new Error(res.errorMsg);
      return res.data;
    },
  });

  if (!ancestors) return null;

  return (
    <NoteBreadcrumbTrail
      ancestors={ancestors}
      ariaLabel={t('explorer.breadcrumbAriaLabel')}
      className="px-4 pt-3 md:px-6 md:pt-4"
      // A BUTTON here, not a link: the folder is already on screen and the
      // crumb selects and expands it rather than navigating anywhere.
      renderCrumb={(ancestor) => (
        <button
          type="button"
          className={NOTE_CRUMB_CLASS}
          onClick={() => onOpenFolder?.(ancestor.id)}
        >
          {ancestor.title}
        </button>
      )}
    />
  );
}
