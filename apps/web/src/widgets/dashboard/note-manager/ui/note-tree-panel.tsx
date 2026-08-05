'use client';

import { useMemo, useState } from 'react';
import { Button } from '@byte-of-me/ui';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Archive, ArrowLeft, FolderPlus, Plus, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';

import {
  buildNoteTree,
  getNoteChildren,
  getNoteLabels,
  getNoteTree,
  NoteEmpty,
  noteKeys,
  NoteTreeItem,
  type NoteTreeNode,
  type NoteTreeNodeWithChildren,
  NoteTreeSkeleton,
} from '@/entities/note';
import { useCreateNote } from '@/features/dashboard/note-actions';
import {
  ExplorerDnd,
  ExplorerViewMenu,
  GroupedRowDndShell,
  GroupSectionDndShell,
  NoteFlatList,
  NoteGroupedList,
  TreeRowDndShell,
  useExplorerPrefs,
} from '@/features/dashboard/note-explorer';
import { InfiniteSentinel } from '@/shared/ui/infinite-sentinel';

interface NoteTreePanelProps {
  activeId: string | null;
  onSelect: (id: string) => void;
  onOpenSearch: () => void;
  /** Shows archived notes instead of live ones — the "trash" view. */
  includeArchived?: boolean;
  onToggleArchived?: () => void;
  /** Space navigation, mounted in this header on phones. */
  navSlot?: React.ReactNode;
  /** Per-row actions menu, supplied by the widget so the entity layer below
   *  never has to import a feature. */
  renderActions?: (node: NoteTreeNode) => React.ReactNode;
}

export function NoteTreePanel({
  activeId,
  onSelect,
  onOpenSearch,
  includeArchived = false,
  onToggleArchived,
  navSlot,
  renderActions,
}: NoteTreePanelProps) {
  const t = useTranslations('dashboard.note');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const { prefs, update: updatePrefs } = useExplorerPrefs();
  // The archived "trash" view stays a plain tree: pin order and grouping are
  // live-notes concepts, and the mode menu is hidden there.
  const mode = includeArchived ? 'tree' : prefs.mode;

  /**
   * INTERIM: the whole-corpus read.
   *
   * The live tree no longer uses it — it loads one level at a time below —
   * but three things still do, and each is someone else's task: the flat and
   * grouped views (which still take `rows` as a prop), the DnD cycle guard
   * inside `ExplorerDnd`, and the archived view (see `archived` below). Task 7
   * converts those; Task 8 deletes `getNoteTree`. Until then this query is
   * still paid for on every dashboard load, so the level-at-a-time tree buys
   * nothing measurable yet — it is the shape that has to land first.
   */
  const corpus = useQuery({
    queryKey: noteKeys.tree(includeArchived),
    queryFn: async () => {
      const res = await getNoteTree(includeArchived);
      if (!res.success) throw new Error(res.errorMsg);
      return res.data;
    },
  });

  // The archived view lists only what is archived. `getNoteTree(true)` returns
  // live notes *and* archived ones — it is "include", not "only" — so without
  // this filter the trash would show the entire corpus.
  const rows = useMemo(() => {
    if (!corpus.data) return [];
    return includeArchived
      ? corpus.data.filter((row) => row.archivedAt !== null)
      : corpus.data;
  }, [corpus.data, includeArchived]);

  // Folders are tree structure, not documents: the flat and grouped views
  // list what you can READ, so pure containers stay out of them.
  const documentsOnly = useMemo(
    () => rows.filter((row) => !row.isFolder),
    [rows]
  );

  /**
   * The ROOT level of the live tree — `parentId: null`, one page at a time.
   * Each folder fetches its own level when it expands; see `NoteTreeItem`.
   */
  const isLevelTree = mode === 'tree' && !includeArchived;
  const rootLevel = useInfiniteQuery({
    queryKey: noteKeys.children(null, includeArchived),
    queryFn: async ({ pageParam }) => {
      const res = await getNoteChildren({
        parentId: null,
        includeArchived,
        cursor: pageParam,
      });
      if (!res.success) throw new Error(res.errorMsg);
      return res.data;
    },
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor,
    enabled: isLevelTree,
  });

  const rootRows = useMemo(
    () => rootLevel.data?.pages.flatMap((page) => page.rows) ?? [],
    [rootLevel.data]
  );

  /**
   * The archived tree, still derived from the corpus — deliberately.
   *
   * `getNoteChildren`'s `includeArchived` is INCLUDE, not ONLY, and archiving
   * cascades to descendants (`archiveNote`), so the common case — archive a
   * note that lived inside a live folder — produces an archived row whose
   * parent is not archived. Today `buildNoteTree` surfaces exactly that row at
   * the root of the trash, because its parent was filtered out of the set. A
   * `parentId: null` read cannot see it at all, so per-level fetching would
   * silently lose most of what the author just archived. The trash is bounded
   * by how much you archive rather than by how much you own, so it keeps the
   * corpus path until a server-side archived-only read exists.
   *
   * `buildNoteTree` is reused rather than re-derived here: it already handles
   * the missing-parent and corrupt-cycle rules, and duplicating them would be
   * the bug AGENTS §11.3 warns about.
   */
  const archived = useMemo(() => {
    const levels = new Map<string, NoteTreeNode[]>();
    if (!includeArchived) return { roots: [] as NoteTreeNode[], levels };

    const roots = buildNoteTree(rows);
    const walk = (nodes: NoteTreeNodeWithChildren[]) => {
      for (const node of nodes) {
        if (node.children.length === 0) continue;
        levels.set(node.id, node.children);
        walk(node.children);
      }
    };
    walk(roots);
    return { roots: roots as NoteTreeNode[], levels };
  }, [rows, includeArchived]);

  // Whichever query actually feeds what is on screen decides that view's
  // loading, error and empty states. In the live tree that is the root level;
  // in the flat, grouped and archived views it is still the corpus. Reading
  // both unconditionally would let a corpus failure blank a perfectly good
  // tree (and vice versa) in a state where nothing on screen came from it.
  const source = isLevelTree ? rootLevel : corpus;
  const isPending = source.isPending;
  const isLoadingError = source.isLoadingError;
  const visibleRows = isLevelTree ? rootRows : rows;
  const treeRows = includeArchived ? archived.roots : rootRows;

  // Label names for the grouped-by-label view; only fetched when shown.
  const { data: labels } = useQuery({
    queryKey: noteKeys.labels(),
    queryFn: async () => {
      const res = await getNoteLabels();
      if (!res.success) throw new Error(res.errorMsg);
      return res.data;
    },
    enabled: mode === 'grouped' && prefs.groupBy === 'label',
  });

  // Shared with the command palette's "New note" action — the invalidation
  // rationale (both trees + searchAll, never `noteKeys.all`) lives on the
  // hook itself in `features/dashboard/note-actions`.
  const create = useCreateNote(onSelect);

  const toggle = (id: string) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1 border-b p-2">
        {navSlot}

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="min-w-0 flex-1 justify-start gap-2 text-muted-foreground"
          onClick={onOpenSearch}
        >
          <Search className="size-3.5 shrink-0" />
          <span className="truncate">{t('search.trigger')}</span>
        </Button>

        {!includeArchived && (
          <ExplorerViewMenu
            mode={prefs.mode}
            sort={prefs.sort}
            groupBy={prefs.groupBy}
            onChange={updatePrefs}
          />
        )}

        {!includeArchived && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t('actions.newFolder')}
            disabled={create.isPending}
            onClick={() => create.mutate({ isFolder: true })}
          >
            <FolderPlus className="size-4" />
          </Button>
        )}

        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t('actions.create')}
          disabled={create.isPending}
          onClick={() => create.mutate({})}
        >
          <Plus className="size-4" />
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-1">
        {/* `isPending` and `isLoadingError` are mutually exclusive branches
            of the same TanStack `status` enum, so neither gate below needs
            to reference the other — unlike the note editor's `isSeeded`,
            which is a second, independently-derived boolean and had to be
            ordered ahead of its error check for that reason (see
            note-editor.tsx's own long comment on it). `visibleRows.length
            === 0` in the line directly below is consequently a dead second
            conjunct — `isPending` already implies `data === undefined`,
            hence no rows — kept rather than removed; deleting it buys
            nothing and this comment is cheaper than a diff. */}
        {isPending && visibleRows.length === 0 && <NoteTreeSkeleton />}

        {/* `isLoadingError`, not `isError`/`length === 0`: TanStack
            Query v5 distinguishes a failure on the query's FIRST attempt
            (`isLoadingError` — no data has ever arrived) from a failure on
            a BACKGROUND refetch while data already sits in the cache
            (`isRefetchError` — the previous `data`, whatever it was, is
            left in place). The create mutation above invalidates this
            exact query on every note it creates, so a single transient
            refetch failure right after a create must not replace whatever
            is already on screen with the load-error message. An earlier
            version of this gate used `isError && tree.length === 0`, which
            protects a good, NON-EMPTY tree correctly but gets the other
            case wrong: a legitimately empty tree (no notes yet) also has
            zero rows, so a failed background refetch right after
            creating a first note would show "Could not load your notes."
            instead of the create-a-note empty state, at exactly the
            moment a first-time author needs it least. `isLoadingError`
            keys on whether a load ever actually SUCCEEDED — the real
            question — and gets both cases right. */}
        {isLoadingError && (
          <p className="p-4 text-sm text-destructive">{t('errors.load')}</p>
        )}

        {!isPending && !isLoadingError && visibleRows.length === 0 && (
          // The archived view gets its own copy: `NoteEmpty` invites the
          // author to write their first note, which is the wrong offer when
          // what they are actually looking at is an empty wastebasket.
          includeArchived ? (
            <p className="p-4 text-sm text-muted-foreground">
              {t('archive.empty')}
            </p>
          ) : (
            <NoteEmpty onCreate={() => create.mutate({})} />
          )
        )}

        {/* One DndContext across every view; the archived tree renders
            without shells, so nothing there drags. */}
        <ExplorerDnd
          rows={rows}
          labels={labels ?? []}
          showRootZone={mode === 'tree' && !includeArchived}
        >
          {treeRows.length > 0 && mode === 'tree' && (
            <ul>
              {treeRows.map((node) => (
                <NoteTreeItem
                  key={node.id}
                  node={node}
                  activeId={activeId}
                  expandedIds={expandedIds}
                  includeArchived={includeArchived}
                  preloadedLevels={
                    includeArchived ? archived.levels : undefined
                  }
                  onSelect={onSelect}
                  onToggle={toggle}
                  renderActions={renderActions}
                  renderRowShell={
                    includeArchived
                      ? undefined
                      : (rowNode, row) => (
                          <TreeRowDndShell node={rowNode}>
                            {row}
                          </TreeRowDndShell>
                        )
                  }
                />
              ))}

              {/* Root level only: every deeper level carries its own sentinel
                  inside `NoteTreeItem`. */}
              {rootLevel.hasNextPage && (
                <li>
                  <InfiniteSentinel
                    hasNextPage={rootLevel.hasNextPage}
                    isFetching={rootLevel.isFetching}
                    onLoadMore={() => void rootLevel.fetchNextPage()}
                  />
                </li>
              )}
            </ul>
          )}

          {documentsOnly.length > 0 && mode === 'flat' && (
            <NoteFlatList
              rows={documentsOnly}
              sort={prefs.sort}
              activeId={activeId}
              onSelect={onSelect}
              renderActions={renderActions}
            />
          )}

          {documentsOnly.length > 0 && mode === 'grouped' && (
            <NoteGroupedList
              rows={documentsOnly}
              groupBy={prefs.groupBy}
              labels={labels ?? []}
              activeId={activeId}
              onSelect={onSelect}
              renderActions={renderActions}
              renderSection={(group, section) => (
                <GroupSectionDndShell key={group.key} group={group}>
                  {section}
                </GroupSectionDndShell>
              )}
              renderRowShell={(group, node, row) => (
                <GroupedRowDndShell group={group} node={node}>
                  {row}
                </GroupedRowDndShell>
              )}
            />
          )}
        </ExplorerDnd>
      </div>

      {onToggleArchived && (
        <div className="border-t p-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-muted-foreground"
            onClick={onToggleArchived}
          >
            {includeArchived ? (
              <ArrowLeft className="size-3.5 shrink-0" />
            ) : (
              <Archive className="size-3.5 shrink-0" />
            )}
            <span className="truncate">
              {includeArchived
                ? t('actions.hideArchived')
                : t('actions.showArchived')}
            </span>
          </Button>
        </div>
      )}
    </div>
  );
}
