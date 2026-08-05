'use client';

import { useState } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

import {
  getNoteGroupSummaries,
  getNotesInGroup,
  NO_LABEL_GROUP_KEY,
  NoteEmpty,
  type NoteGroupSummary,
  noteKeys,
  type NoteTreeNode,
  NoteTreeSkeleton,
} from '@/entities/note';
import type {
  ExplorerGroup,
  GroupBy,
} from '@/features/dashboard/note-explorer/lib/explorer-model';
import { ExplorerRow } from '@/features/dashboard/note-explorer/ui/explorer-row';
import { cn } from '@/shared/lib/utils';
import { InfiniteSentinel } from '@/shared/ui/infinite-sentinel';

/** What a section needs from its parent, minus the summary it renders. */
interface SectionChrome {
  groupBy: GroupBy;
  includeArchived: boolean;
  activeId: string | null;
  onSelect: (id: string) => void;
  renderActions?: (node: NoteTreeNode) => React.ReactNode;
  /** Wraps each row — how the DnD layer attaches drag handles. */
  renderRowShell?: (
    group: ExplorerGroup,
    node: NoteTreeNode,
    row: React.ReactNode
  ) => React.ReactNode;
}

/**
 * The explorer's grouped view: collapsible sections per status or label.
 * `renderSection` lets the DnD layer wrap a section in a drop target without
 * this component knowing dnd-kit exists.
 *
 * Two queries, not one. The section list comes from `getNoteGroupSummaries` —
 * an aggregate that never paginates, so a header states the bucket's TRUE size
 * — while each expanded section pages its own rows in. The client-side
 * `groupRows` this replaces could only bucket and count what it already held,
 * and it only held everything because the sidebar fetched the whole corpus.
 */
export function NoteGroupedList({
  groupBy,
  includeArchived = false,
  activeId,
  onSelect,
  onCreate,
  renderActions,
  renderSection,
  renderRowShell,
}: {
  groupBy: GroupBy;
  includeArchived?: boolean;
  activeId: string | null;
  onSelect: (id: string) => void;
  /** The empty state's call to action, owned by the panel's create mutation. */
  onCreate: () => void;
  renderActions?: (node: NoteTreeNode) => React.ReactNode;
  renderSection?: (
    group: ExplorerGroup,
    section: React.ReactNode
  ) => React.ReactNode;
  renderRowShell?: (
    group: ExplorerGroup,
    node: NoteTreeNode,
    row: React.ReactNode
  ) => React.ReactNode;
}) {
  const t = useTranslations('dashboard.note');
  // Collapsed state stays HERE rather than inside each section: keyed by
  // bucket key, it survives a summaries refetch re-ordering or remounting the
  // sections, which per-section `useState` would not.
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const summaries = useQuery({
    queryKey: noteKeys.groups(groupBy, includeArchived),
    queryFn: async () => {
      const res = await getNoteGroupSummaries({ groupBy, includeArchived });
      if (!res.success) throw new Error(res.errorMsg);
      return res.data;
    },
  });

  const toggle = (key: string) => {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  if (summaries.isPending) return <NoteTreeSkeleton />;

  // `isLoadingError`, not `isError` — same reasoning as the flat list and the
  // tree: a failed background refetch must not blank sections that loaded.
  if (summaries.isLoadingError) {
    return <p className="p-4 text-sm text-destructive">{t('errors.load')}</p>;
  }

  // No buckets means no documents at all: the aggregate omits empty ones.
  if (summaries.data.length === 0) return <NoteEmpty onCreate={onCreate} />;

  return (
    <div className="flex flex-col gap-1">
      {summaries.data.map((summary) => (
        <GroupSection
          key={summary.key}
          summary={summary}
          isCollapsed={collapsed.has(summary.key)}
          onToggle={toggle}
          groupBy={groupBy}
          includeArchived={includeArchived}
          activeId={activeId}
          onSelect={onSelect}
          renderActions={renderActions}
          renderSection={renderSection}
          renderRowShell={renderRowShell}
        />
      ))}
    </div>
  );
}

function GroupSection({
  summary,
  isCollapsed,
  onToggle,
  groupBy,
  includeArchived,
  activeId,
  onSelect,
  renderActions,
  renderSection,
  renderRowShell,
}: SectionChrome & {
  summary: NoteGroupSummary;
  isCollapsed: boolean;
  onToggle: (key: string) => void;
  renderSection?: (
    group: ExplorerGroup,
    section: React.ReactNode
  ) => React.ReactNode;
}) {
  const t = useTranslations('dashboard.note');

  /**
   * This section's rows, one page at a time and only while it is open.
   *
   * `enabled: !isCollapsed` is the same bargain the tree strikes: a collapsed
   * bucket costs nothing, and TanStack keeps an open one's pages, so folding
   * and unfolding is instant rather than a second round trip.
   */
  const list = useInfiniteQuery({
    queryKey: noteKeys.groupRows(groupBy, summary.key, includeArchived),
    queryFn: async ({ pageParam }) => {
      const res = await getNotesInGroup({
        groupBy,
        key: summary.key,
        includeArchived,
        cursor: pageParam,
      });
      if (!res.success) throw new Error(res.errorMsg);
      return res.data;
    },
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor,
    enabled: !isCollapsed,
  });

  const rows = list.data?.pages.flatMap((page) => page.rows) ?? [];

  const group: ExplorerGroup = {
    key: summary.key,
    // `getNoteGroupSummaries` hands back the raw key token for the unlabeled
    // bucket, deliberately: a server action has no locale to translate into
    // and that layer stays i18n-free. This is the one place that knows the
    // reader's language, so this is where the token becomes prose.
    title:
      summary.key === NO_LABEL_GROUP_KEY
        ? t('explorer.noLabel')
        : summary.title,
    labelId: summary.labelId,
    // The rows LOADED so far — the DnD shells only read `key`/`labelId`, and
    // the header's count comes from the summary, never from this array.
    rows,
  };

  const section = (
    <section key={group.key}>
      <button
        type="button"
        aria-expanded={!isCollapsed}
        onClick={() => onToggle(group.key)}
        className="flex w-full items-center gap-1 rounded-md px-1 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
      >
        <ChevronRight
          className={cn(
            'size-3.5 transition-transform',
            !isCollapsed && 'rotate-90'
          )}
        />
        <span className="truncate">{group.title}</span>
        <span className="ml-1 rounded-full bg-muted px-1.5 text-[10px] tabular-nums">
          {/* The aggregate's count, not `rows.length`: this section paginates,
              so a count off the loaded rows would understate the bucket and
              keep climbing as the reader scrolled. */}
          {summary.count}
        </span>
      </button>

      {!isCollapsed && (
        // `aria-busy` rather than a live region, matching `NoteTreeItem`: an
        // empty <ul> under an open header reads as "this bucket is empty",
        // which the author cannot tell apart from the truth.
        <ul aria-busy={list.isPending ? true : undefined}>
          {rows.map((node) => {
            const rowElement = (
              <ExplorerRow
                node={node}
                isActive={node.id === activeId}
                onSelect={onSelect}
                actions={renderActions?.(node)}
              />
            );
            return (
              <li key={`${group.key}:${node.id}`}>
                {renderRowShell
                  ? renderRowShell(group, node, rowElement)
                  : rowElement}
              </li>
            );
          })}

          {list.isLoadingError && (
            <li className="px-1 py-1 text-xs text-destructive">
              {t('errors.load')}
            </li>
          )}

          {/* Tested out here as well as inside the sentinel so a `<div>` never
              becomes a direct child of this `<ul>`. */}
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
      )}
    </section>
  );

  return renderSection ? renderSection(group, section) : section;
}
