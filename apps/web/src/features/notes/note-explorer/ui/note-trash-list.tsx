'use client';

import type { NoteTreeNode } from '@/entities/note';
import { ExplorerRow } from '@/features/notes/note-explorer/ui/explorer-row';
import { InfiniteSentinel } from '@/shared/ui/infinite-sentinel';

interface NoteTrashListProps {
  rows: readonly NoteTreeNode[];
  activeId: string | null;
  onSelect: (id: string) => void;
  hasNextPage: boolean;
  isFetching: boolean;
  onLoadMore: () => void;
  renderActions?: (node: NoteTreeNode) => React.ReactNode;
}

/**
 * The trash: archived notes, newest first, flat.
 *
 * Flat rather than a tree, and that is the shape the data forces. Archiving
 * cascades DOWN a subtree, so archiving a note that lived inside a live folder
 * leaves an archived row whose parent is NOT archived — it belongs to no level
 * of anything. Rebuilding the hierarchy would mean fetching every archived row
 * just to find the parents, which is the whole-corpus read the explorer exists
 * to avoid. A wastebasket ordered by when things went into it is also what the
 * view is for.
 *
 * Nothing here drags, and nothing here is selectable by keyboard: reordering or
 * re-parenting something already in the bin is not a move anyone means to make.
 */
export function NoteTrashList({
  rows,
  activeId,
  onSelect,
  hasNextPage,
  isFetching,
  onLoadMore,
  renderActions,
}: NoteTrashListProps) {
  if (rows.length === 0) return null;

  return (
    <ul>
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

      {hasNextPage && (
        <li>
          <InfiniteSentinel
            hasNextPage={hasNextPage}
            isFetching={isFetching}
            onLoadMore={onLoadMore}
          />
        </li>
      )}
    </ul>
  );
}
