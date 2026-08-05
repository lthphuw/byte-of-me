'use client';

import { useMemo, useState } from 'react';
import { Button } from '@byte-of-me/ui';
import { useQuery } from '@tanstack/react-query';
import { Archive, ArrowLeft, FolderPlus, Plus, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';

import {
  buildNoteTree,
  getNoteLabels,
  getNoteTree,
  NoteEmpty,
  noteKeys,
  NoteTreeItem,
  type NoteTreeNode,
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

  const { data, isPending, isLoadingError } = useQuery({
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
    if (!data) return [];
    return includeArchived
      ? data.filter((row) => row.archivedAt !== null)
      : data;
  }, [data, includeArchived]);

  const tree = useMemo(() => buildNoteTree(rows), [rows]);

  // Folders are tree structure, not documents: the flat and grouped views
  // list what you can READ, so pure containers stay out of them.
  const documentsOnly = useMemo(
    () => rows.filter((row) => !row.isFolder),
    [rows]
  );

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
            note-editor.tsx's own long comment on it). `tree.length === 0`
            in the line directly below is consequently a dead second
            conjunct — `isPending` already implies `data === undefined`,
            hence `tree.length === 0` — kept rather than removed; deleting
            it buys nothing and this comment is cheaper than a diff. */}
        {isPending && tree.length === 0 && <NoteTreeSkeleton />}

        {/* `isLoadingError`, not `isError`/`tree.length === 0`: TanStack
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
            `tree.length === 0`, so a failed background refetch right after
            creating a first note would show "Could not load your notes."
            instead of the create-a-note empty state, at exactly the
            moment a first-time author needs it least. `isLoadingError`
            keys on whether a load ever actually SUCCEEDED — the real
            question — and gets both cases right. */}
        {isLoadingError && (
          <p className="p-4 text-sm text-destructive">{t('errors.load')}</p>
        )}

        {!isPending && !isLoadingError && tree.length === 0 && (
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
          {tree.length > 0 && mode === 'tree' && (
            <ul>
              {tree.map((node) => (
                <NoteTreeItem
                  key={node.id}
                  node={node}
                  activeId={activeId}
                  expandedIds={expandedIds}
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
