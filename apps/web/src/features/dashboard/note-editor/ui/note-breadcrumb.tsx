'use client';

import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '@byte-of-me/ui';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import { getNoteAncestors, type NoteAncestor, noteKeys } from '@/entities/note';

/** Beyond this, the middle of the path collapses to an ellipsis. */
const MAX_CRUMBS = 3;

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

  if (!ancestors || ancestors.length === 0) return null;

  // Keep the FIRST and the last two: the root anchors the path and the nearest
  // folders are what the author is actually working in. The middle is what a
  // deep path can afford to lose.
  const isTruncated = ancestors.length > MAX_CRUMBS;
  const shown: NoteAncestor[] = isTruncated
    ? [ancestors[0] as NoteAncestor, ...ancestors.slice(-2)]
    : ancestors;

  return (
    <Breadcrumb
      aria-label={t('explorer.breadcrumbAriaLabel')}
      className="shrink-0 px-4 pt-3 md:px-6 md:pt-4"
    >
      <BreadcrumbList className="gap-1 text-xs sm:gap-1">
        {shown.map((ancestor, index) => (
          <BreadcrumbItem key={ancestor.id}>
            {/* The ellipsis stands where the dropped crumbs were: after the
                root, before the tail. */}
            {isTruncated && index === 1 && (
              <>
                <BreadcrumbEllipsis className="size-3" />
                <BreadcrumbSeparator />
              </>
            )}

            <button
              type="button"
              className="max-w-[12ch] truncate rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring sm:max-w-[20ch]"
              onClick={() => onOpenFolder?.(ancestor.id)}
            >
              {ancestor.title}
            </button>

            {index < shown.length - 1 && <BreadcrumbSeparator />}
          </BreadcrumbItem>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
