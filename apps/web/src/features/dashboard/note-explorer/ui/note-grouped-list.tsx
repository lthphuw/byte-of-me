'use client';

import { useMemo, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

import {
  type ExplorerGroup,
  type GroupBy,
  groupRows,
} from '@/features/dashboard/note-explorer/lib/explorer-model';
import { ExplorerRow } from '@/features/dashboard/note-explorer/ui/explorer-row';

import type { NoteLabelSummary, NoteTreeNode } from '@/entities/note';
import { cn } from '@/shared/lib/utils';

/**
 * The explorer's grouped view: collapsible sections per status or label.
 * `renderSection` lets the DnD layer wrap a section in a drop target without
 * this component knowing dnd-kit exists.
 */
export function NoteGroupedList({
  rows,
  groupBy,
  labels,
  activeId,
  onSelect,
  renderActions,
  renderSection,
  renderRowShell,
}: {
  rows: NoteTreeNode[];
  groupBy: GroupBy;
  labels: NoteLabelSummary[];
  activeId: string | null;
  onSelect: (id: string) => void;
  renderActions?: (node: NoteTreeNode) => React.ReactNode;
  renderSection?: (
    group: ExplorerGroup,
    section: React.ReactNode
  ) => React.ReactNode;
  /** Wraps each row — how the DnD layer attaches drag handles. */
  renderRowShell?: (
    group: ExplorerGroup,
    node: NoteTreeNode,
    row: React.ReactNode
  ) => React.ReactNode;
}) {
  const t = useTranslations('dashboard.note.explorer');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const groups = useMemo(
    () => groupRows(rows, groupBy, labels, t('noLabel')),
    [rows, groupBy, labels, t]
  );

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

  if (groups.length === 0) return null;

  return (
    <div className="flex flex-col gap-1">
      {groups.map((group) => {
        const isCollapsed = collapsed.has(group.key);
        const section = (
          <section key={group.key}>
            <button
              type="button"
              aria-expanded={!isCollapsed}
              onClick={() => toggle(group.key)}
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
                {group.rows.length}
              </span>
            </button>

            {!isCollapsed && (
              <ul>
                {group.rows.map((node) => {
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
              </ul>
            )}
          </section>
        );

        return renderSection ? renderSection(group, section) : section;
      })}
    </div>
  );
}
