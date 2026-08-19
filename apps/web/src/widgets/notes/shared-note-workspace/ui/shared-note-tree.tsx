'use client';

import { useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import {
  NoteRow,
  NoteRowSkeleton,
  type NoteTreeNode,
  NoteTreeSkeleton,
} from '@/entities/note';
import {
  getSharedNoteChildren,
  noteShareKeys,
  sharedNoteHref,
} from '@/entities/note-share';
import { useRouter } from '@/shared/i18n/navigation';
import { InfiniteSentinel } from '@/shared/ui/infinite-sentinel';

/**
 * One level of the shared tree, recursing on expand.
 *
 * Each level is its own cursor-paginated query, mirroring the owner's
 * explorer: a collapsed folder costs nothing until somebody opens it, and an
 * open one arrives a page at a time instead of in one unbounded read.
 * `NoteRow` is reused as-is — it is purely presentational and
 * `getSharedNoteChildren` already returns the `NoteTreeNode` it expects.
 * `NoteTreeItem` is deliberately NOT reused: it is wired to
 * `NoteExplorerControls`, an interaction contract (drafts, renames, drag) this
 * surface does not have and must not grow.
 */
export function SharedNoteTree({
  parentId,
  activeId,
  depth = 0,
}: {
  parentId: string;
  /** The note currently open, for the row's active state. */
  activeId: string;
  depth?: number;
}) {
  const t = useTranslations('share.note');
  const router = useRouter();
  const [expandedIds, setExpandedIds] = useState<ReadonlySet<string>>(
    () => new Set()
  );

  const level = useInfiniteQuery({
    queryKey: noteShareKeys.children(parentId),
    queryFn: async ({ pageParam }) => {
      const res = await getSharedNoteChildren({ parentId, cursor: pageParam });
      if (!res.success) throw new Error(res.errorMsg);
      return res.data;
    },
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor,
  });

  const rows = level.data?.pages.flatMap((page) => page.rows) ?? [];

  const toggle = (id: string) =>
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });

  if (level.isPending) {
    // The entity's own placeholder, not a hand-rolled one. It derives its box
    // from `note-row-shell.ts` — the single definition every row-shaped thing
    // shares — so the loading rail lines up with the loaded one instead of
    // drifting from it, which is exactly what a local copy would do.
    return depth === 0 ? (
      <NoteTreeSkeleton />
    ) : (
      <>
        <NoteRowSkeleton depth={depth} index={0} />
        <NoteRowSkeleton depth={depth} index={1} />
      </>
    );
  }

  // `isLoadingError`, not `isError`: a failed BACKGROUND refetch leaves the
  // pages already loaded on screen and must not replace them with an error
  // line. Same distinction the owner's `NoteTreeItem` documents.
  if (level.isLoadingError) {
    return (
      <p className="px-2 py-1 text-xs text-destructive">{t('notFound')}</p>
    );
  }

  if (rows.length === 0) {
    return depth === 0 ? (
      <p className="px-2 py-1 text-xs text-muted-foreground">
        {t('emptyFolder')}
      </p>
    ) : null;
  }

  return (
    <ul className="flex flex-col">
      {rows.map((node: NoteTreeNode) => {
        const isExpanded = expandedIds.has(node.id);

        return (
          <li key={node.id}>
            <NoteRow
              node={node}
              depth={depth}
              isActive={node.id === activeId}
              // The explorer's cursor is an owner-side concept; here the URL
              // is the only selection there is.
              isSelected={false}
              isExpanded={isExpanded}
              hasChildren={node.childCount > 0}
              onToggle={() => toggle(node.id)}
              onActivate={() => {
                if (node.isFolder) {
                  toggle(node.id);
                  return;
                }
                router.push(sharedNoteHref(node.id));
              }}
              // No rename, and no prefetch-on-hover: renaming is owner-only,
              // and warming a route this surface refuses for most ids would
              // spend requests to learn nothing.
              onStartRename={() => {}}
              onWarm={() => {}}
              expandLabel={t('expand')}
              collapseLabel={t('collapse')}
            />

            {isExpanded ? (
              <SharedNoteTree
                parentId={node.id}
                activeId={activeId}
                depth={depth + 1}
              />
            ) : null}
          </li>
        );
      })}

      {/* The `hasNextPage` test is repeated out here (the sentinel also
          renders nothing without it) so a `<div>` never becomes a direct child
          of this `<ul>`. */}
      {level.hasNextPage && (
        <li>
          <InfiniteSentinel
            hasNextPage={level.hasNextPage}
            isFetching={level.isFetching}
            onLoadMore={() => void level.fetchNextPage()}
          />
        </li>
      )}
    </ul>
  );
}
