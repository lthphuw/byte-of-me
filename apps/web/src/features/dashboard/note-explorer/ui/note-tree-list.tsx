'use client';

import { useTranslations } from 'next-intl';

import {
  type NoteExplorerControls,
  NoteRowInput,
  NoteRowSkeleton,
  NoteTreeItem,
  type NoteTreeNode,
} from '@/entities/note';
import { TreeRowDndShell } from '@/features/dashboard/note-explorer/ui/explorer-dnd';
import { InfiniteSentinel } from '@/shared/ui/infinite-sentinel';

interface NoteTreeListProps {
  rootRows: readonly NoteTreeNode[];
  activeId: string | null;
  explorer: NoteExplorerControls;
  onSelect: (id: string) => void;
  hasNextPage: boolean;
  isFetching: boolean;
  onLoadMore: () => void;
  /**
   * The levels a create is in flight for — `null` is the root. Each one draws a
   * pending row where the new note or folder will land; see the panel, which
   * reads them off the mutation cache.
   */
  pendingParentIds?: ReadonlySet<string | null>;
  renderActions?: (node: NoteTreeNode) => React.ReactNode;
  renderContextMenu?: (
    node: NoteTreeNode,
    row: React.ReactNode
  ) => React.ReactNode;
}

/**
 * The tree itself: the `role="tree"` list, its rows, and the root-level draft.
 *
 * Renders nothing when there are no root rows AND no root draft — an author
 * with no notes at all still has to be able to type the name of their first
 * one, which is what the empty state hands off to.
 *
 * The keyboard handler is NOT here; it lives on the scroll container above this
 * list, so that one handler covers every row through bubbling. See
 * `useTreeKeyboard`.
 */
export function NoteTreeList({
  rootRows,
  activeId,
  explorer,
  onSelect,
  hasNextPage,
  isFetching,
  onLoadMore,
  pendingParentIds,
  renderActions,
  renderContextMenu,
}: NoteTreeListProps) {
  const t = useTranslations('dashboard.note');
  const hasRootDraft = explorer.draft?.parentId === null;
  const isCreatingHere = pendingParentIds?.has(null) ?? false;

  if (rootRows.length === 0 && !hasRootDraft && !isCreatingHere) return null;

  return (
    // `aria-busy` while a create is in flight for THIS level, the same signal
    // `NoteTreeItem` and the flat view use for a list whose contents are not
    // final yet. The pending row below is decorative.
    <ul
      role="tree"
      aria-label={t('tree.treeAriaLabel')}
      aria-busy={isCreatingHere ? true : undefined}
    >
      {rootRows.map((node) => (
        <NoteTreeItem
          key={node.id}
          node={node}
          activeId={activeId}
          explorer={explorer}
          onSelect={onSelect}
          pendingParentIds={pendingParentIds}
          renderActions={renderActions}
          renderContextMenu={renderContextMenu}
          renderRowShell={(rowNode, row) => (
            <TreeRowDndShell node={rowNode}>{row}</TreeRowDndShell>
          )}
        />
      ))}

      {/* The root level's draft. Deeper levels render their own inside
          `NoteTreeItem`, next to the children they belong among. */}
      {hasRootDraft && explorer.draft && (
        <li>
          <NoteRowInput
            depth={0}
            isFolder={explorer.draft.isFolder}
            label={
              explorer.draft.isFolder
                ? t('tree.draftFolderLabel')
                : t('tree.draftNoteLabel')
            }
            onSubmit={explorer.submitDraft}
            onCancel={explorer.cancelDraft}
          />
        </li>
      )}

      {/* The create the draft just committed, still in flight — where the
          draft stood and where the real row lands, so the level never snaps
          back to looking untouched. It survives until the level has re-read;
          see `useCreateNote`. `<li>` because `NoteRowSkeleton` is a `div`. */}
      {isCreatingHere && (
        <li aria-hidden>
          <NoteRowSkeleton depth={0} index={rootRows.length} />
        </li>
      )}

      {/* Root level only: every deeper level carries its own sentinel inside
          `NoteTreeItem`. */}
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
