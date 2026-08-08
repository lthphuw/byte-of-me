'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import { NOTE_CRUMB_CLASS, NoteBreadcrumbTrail } from '@/entities/note';
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
 * at the share root server-side. Nothing is truncated for secrecy here and
 * nothing is prepended: a crumb this component invented would be a folder
 * name the server deliberately withheld.
 *
 * The trail itself is the entity's, shared with the owner's editor header.
 * Only the crumb differs — a LINK here, because a rung is a route change,
 * where the owner's is a button that selects a folder already on screen.
 */
export function SharedNoteBreadcrumb({ noteId }: { noteId: string }) {
  const t = useTranslations('share.note');

  const { data: ancestors } = useQuery({
    queryKey: noteShareKeys.ancestors(noteId),
    queryFn: async () => {
      const res = await getSharedNoteAncestors(noteId);
      if (!res.success) throw new Error(res.errorMsg);
      return res.data;
    },
  });

  if (!ancestors) return null;

  return (
    <NoteBreadcrumbTrail
      ancestors={ancestors}
      ariaLabel={t('breadcrumbAriaLabel')}
      renderCrumb={(ancestor) => (
        <Link href={sharedNoteHref(ancestor.id)} className={NOTE_CRUMB_CLASS}>
          {ancestor.title}
        </Link>
      )}
    />
  );
}
