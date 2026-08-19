'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import {
  getNotesPage,
  NoteEmpty,
  noteKeys,
  NoteRowSkeleton,
  type NoteTreeNode,
  NoteTreeSkeleton,
} from '@/entities/note';
import type { FlatSort } from '@/features/notes/note-explorer/lib/explorer-model';
import { ExplorerRow } from '@/features/notes/note-explorer/ui/explorer-row';
import { InfiniteSentinel } from '@/shared/ui/infinite-sentinel';

/**
 * The explorer's flat view: every document, in the chosen order, one page at a
 * time.
 *
 * It used to receive the corpus as a `rows` prop and sort it client-side with
 * `sortFlat`. Both are gone: a client sort can only order the window it holds,
 * so sorting a page would put a row at the top of page 2 that belongs at the
 * top of page 1. The order is `getNotesPage`'s, and the cursor rides that same
 * total order. Owning its own query is also what lets this component state its
 * own loading, error and empty cases — the panel can no longer see its rows.
 */
export function NoteFlatList({
  sort,
  includeArchived = false,
  activeId,
  onSelect,
  onCreate,
  renderActions,
}: {
  sort: FlatSort;
  includeArchived?: boolean;
  activeId: string | null;
  onSelect: (id: string) => void;
  /** The empty state's call to action, owned by the panel's create mutation. */
  onCreate: () => void;
  renderActions?: (node: NoteTreeNode) => React.ReactNode;
}) {
  const t = useTranslations('dashboard.note');

  const list = useInfiniteQuery({
    queryKey: noteKeys.page(includeArchived, sort),
    queryFn: async ({ pageParam }) => {
      const res = await getNotesPage({
        sort,
        includeArchived,
        cursor: pageParam,
      });
      if (!res.success) throw new Error(res.errorMsg);
      return res.data;
    },
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor,
  });

  const rows = list.data?.pages.flatMap((page) => page.rows) ?? [];

  if (list.isPending) return <NoteTreeSkeleton />;

  // `isLoadingError`, not `isError`: a failed BACKGROUND refetch (a create's
  // invalidation triggers exactly one) leaves the loaded pages in place, and
  // replacing a perfectly good list with an error line is the regression
  // `note-tree-panel.tsx` documents at length for the tree.
  if (list.isLoadingError) {
    return <p className="p-4 text-sm text-destructive">{t('errors.load')}</p>;
  }

  if (rows.length === 0) return <NoteEmpty onCreate={onCreate} />;

  return (
    // `aria-busy` while the NEXT page is in flight, matching `NoteTreeItem`
    // and the grouped view's sections: the placeholder row below is
    // decorative, and this is the standard way to say "the contents of this
    // container are not final yet" without inventing a string.
    <ul aria-busy={list.isFetchingNextPage ? true : undefined}>
      {rows.map((node) => (
        <li key={node.id}>
          <ExplorerRow
            node={node}
            isActive={node.id === activeId}
            onSelect={onSelect}
            actions={renderActions?.(node)}
          />
        </li>
      ))}

      {/* The NEXT page, in flight. `isFetchingNextPage` and not the broader
          `isFetching`: every create and rename invalidates this key, and a
          background refetch of page one must not push a placeholder row onto
          the end of a list the author is reading — the same discipline
          `note-tree-panel.tsx` documents for not replacing loaded rows. The
          sentinel below is `h-px` and invisible, so without this the list
          simply stopped at the last loaded row, with nothing to say another
          page was on its way. */}
      {list.isFetchingNextPage && (
        // Wrapped in `<li>` because `NoteRowSkeleton` is a `div` — it also
        // serves the tree, which is a `ul` too.
        <li aria-hidden>
          <NoteRowSkeleton index={rows.length} />
        </li>
      )}

      {/* The `hasNextPage` test is repeated out here (the sentinel also
          renders nothing without it) so a `<div>` never becomes a direct
          child of this `<ul>`. */}
      {list.hasNextPage && (
        <li>
          <InfiniteSentinel
            hasNextPage={list.hasNextPage}
            isFetching={list.isFetching}
            onLoadMore={() => void list.fetchNextPage()}
          />
        </li>
      )}
    </ul>
  );
}
