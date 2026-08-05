'use client';

import { Button, Skeleton } from '@byte-of-me/ui';
import { useInfiniteQuery } from '@tanstack/react-query';
import { ChevronRight, FileText, Folder, FolderOpen } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { getNoteChildren } from '@/entities/note/api/get-note-children';
import { noteKeys } from '@/entities/note/model/query-keys';
import type { NoteTreeNode } from '@/entities/note/model/types';
import { useNotePrefetch } from '@/entities/note/model/use-note-prefetch';
import { cn } from '@/shared/lib/utils';
import { InfiniteSentinel } from '@/shared/ui/infinite-sentinel';

/** Shared empty level, so a row with no children re-renders referentially stable. */
const NO_ROWS: NoteTreeNode[] = [];

// Deliberately not a role="tree"/"treeitem" widget: that ARIA pattern
// obligates the full tree keyboard interaction model (arrow-key navigation,
// type-ahead, roving tabindex), none of which this component implements.
// A partial tree role is worse than none — assistive tech would announce
// affordances that do not work. Each row is a plain button; the ARIA states
// below (aria-expanded, aria-current) are chosen because they are valid on a
// plain button without any ancestor role, unlike aria-selected which only
// has defined semantics on option/tab/treeitem/row-family roles.
interface NoteTreeItemProps {
  /**
   * A FLAT row. This component used to take a pre-nested
   * `NoteTreeNodeWithChildren` built from the whole corpus; it now fetches its
   * own level, so the caller only ever hands it one row.
   */
  node: NoteTreeNode;
  activeId: string | null;
  expandedIds: Set<string>;
  depth?: number;
  /** Passed straight through to this row's own `getNoteChildren` read. */
  includeArchived?: boolean;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
  /**
   * Row actions (archive, delete), rendered at the end of the row.
   *
   * A slot rather than an import: the menu is a feature, and an entity that
   * imported one would invert the layering AGENTS §3 sets out. The widget
   * that owns the tree passes it down.
   */
  renderActions?: (node: NoteTreeNode) => React.ReactNode;
  /**
   * Wraps the ROW (not the children list) — how the drag-and-drop feature
   * attaches its handles and drop targets without this entity ever importing
   * dnd-kit. Same layering rule as `renderActions`.
   */
  renderRowShell?: (
    node: NoteTreeNode,
    row: React.ReactNode
  ) => React.ReactNode;
}

export function NoteTreeItem({
  node,
  activeId,
  expandedIds,
  depth = 0,
  includeArchived = false,
  onSelect,
  onToggle,
  renderActions,
  renderRowShell,
}: NoteTreeItemProps) {
  const t = useTranslations('dashboard.note');
  const prefetch = useNotePrefetch();
  const isExpanded = expandedIds.has(node.id);
  const isActive = node.id === activeId;

  /**
   * This row's own level, one page at a time.
   *
   * `enabled: isExpanded` is the whole point: a collapsed folder costs
   * nothing, and TanStack keeps an expanded one's pages cached, so collapsing
   * and re-expanding is instant rather than a second round trip. The old
   * component recursed over a `children` array that a single whole-corpus
   * query had already paid for — the cost the explorer is losing here.
   */
  const level = useInfiniteQuery({
    queryKey: noteKeys.children(node.id, includeArchived),
    queryFn: async ({ pageParam }) => {
      const res = await getNoteChildren({
        parentId: node.id,
        includeArchived,
        cursor: pageParam,
      });
      if (!res.success) throw new Error(res.errorMsg);
      return res.data;
    },
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor,
    enabled: isExpanded,
  });

  const childRows =
    level.data?.pages.flatMap((page) => page.rows) ?? NO_ROWS;

  // `childCount` rides along on the row itself, so the chevron is correct
  // BEFORE a single child has been fetched — the entire reason that field
  // exists. Deriving it from `childRows` instead would leave every collapsed
  // folder looking like a leaf until the author clicked it to find out.
  const hasChildren = node.childCount > 0;

  // Hover and keyboard focus both mean "about to open this", and both give
  // the document a head start the click itself cannot. Folders have no
  // document to fetch; the note already on screen is already in cache.
  const warm = () => {
    if (node.isFolder || isActive) return;
    prefetch(node.id);
  };

  const row = (
      <div
        className={cn(
          // `group` so the actions slot can reveal itself on hover; `min-h-9`
          // so a row is a 36px touch target on a phone, where the old
          // `py-1.5`-only row was ~26px — below the 44px Apple/Material floor
          // and genuinely hard to hit next to a sibling row.
          'group flex min-h-9 items-center gap-1 rounded-md pr-1 text-sm transition-colors md:min-h-0',
          isActive
            ? 'bg-muted font-medium text-foreground'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        )}
        // Indentation is inline because the depth is data, not a fixed scale.
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn('size-7 shrink-0', !hasChildren && 'invisible')}
          aria-label={
            isExpanded ? t('tree.collapseAriaLabel') : t('tree.expandAriaLabel')
          }
          aria-expanded={hasChildren ? isExpanded : undefined}
          onClick={() => onToggle(node.id)}
        >
          <ChevronRight
            className={cn('h-3.5 w-3.5 transition-transform', isExpanded && 'rotate-90')}
          />
        </Button>

        <button
          type="button"
          // A folder has no document to open — clicking it expands it, the
          // way Obsidian's file explorer behaves.
          onClick={() =>
            node.isFolder ? onToggle(node.id) : onSelect(node.id)
          }
          onPointerEnter={warm}
          onFocus={warm}
          // aria-current (not aria-selected) because there is no surrounding
          // role="tree"/"listbox" to make aria-selected valid — see the note
          // on ARIA scope in the module comment above. This node behaves like
          // the current entry in a set of related documents, which is exactly
          // what aria-current models (compare blog-breadcrumb.tsx's
          // aria-current="page"); "true" is the generic token for a set that
          // isn't a page, step, date or time.
          aria-current={isActive ? 'true' : undefined}
          className="flex min-w-0 flex-1 items-center gap-2 py-1.5 text-left"
        >
          {node.isFolder ? (
            isExpanded ? (
              <FolderOpen className="size-3.5 shrink-0" />
            ) : (
              <Folder className="size-3.5 shrink-0" />
            )
          ) : (
            <FileText className="size-3.5 shrink-0" />
          )}
          <span className="truncate">{node.title}</span>
        </button>

        {renderActions?.(node)}
      </div>
  );

  return (
    <li>
      {renderRowShell ? renderRowShell(node, row) : row}

      {hasChildren && isExpanded && (
        // `aria-busy` rather than a live region: the placeholder below is
        // decorative, and this is the standard way to say "the contents of
        // this container are not final yet" without inventing a string.
        <ul aria-busy={level.isPending ? true : undefined}>
          {childRows.map((child) => (
            <NoteTreeItem
              key={child.id}
              node={child}
              activeId={activeId}
              expandedIds={expandedIds}
              depth={depth + 1}
              includeArchived={includeArchived}
              onSelect={onSelect}
              onToggle={onToggle}
              renderActions={renderActions}
              renderRowShell={renderRowShell}
            />
          ))}

          {/* An expanded folder whose first page is still in flight would
              otherwise render an empty list, which reads as "this folder is
              empty" — a lie the author has no way to distinguish from the
              truth. A skeleton is what the panel already uses to say
              "loading", so the tree says it the same way. */}
          {level.isPending && (
            <li
              aria-hidden
              className="py-1"
              style={{ paddingLeft: `${(depth + 1) * 12 + 4}px` }}
            >
              <Skeleton className="h-6 w-2/3" />
            </li>
          )}

          {/* `isLoadingError`, not `isError`: a failed BACKGROUND refetch
              leaves the previously-loaded rows in place and must not replace
              them with an error line. Same distinction the panel documents at
              length for the root level. */}
          {level.isLoadingError && (
            <li
              className="py-1 text-xs text-destructive"
              style={{ paddingLeft: `${(depth + 1) * 12 + 4}px` }}
            >
              {t('errors.load')}
            </li>
          )}

          {/* The `hasNextPage` test is repeated out here (the sentinel also
              renders nothing without it) so a `<div>` never becomes a direct
              child of this `<ul>`. */}
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
      )}
    </li>
  );
}
