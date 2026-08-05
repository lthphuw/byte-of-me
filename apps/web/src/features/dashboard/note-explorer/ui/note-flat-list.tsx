'use client';

import { useMemo } from 'react';

import { type FlatSort, sortFlat } from '@/features/dashboard/note-explorer/lib/explorer-model';
import { ExplorerRow } from '@/features/dashboard/note-explorer/ui/explorer-row';

import type { NoteTreeNode } from '@/entities/note';

/** The explorer's flat view: every note, one level, in the chosen order. */
export function NoteFlatList({
  rows,
  sort,
  activeId,
  onSelect,
  renderActions,
}: {
  rows: NoteTreeNode[];
  sort: FlatSort;
  activeId: string | null;
  onSelect: (id: string) => void;
  renderActions?: (node: NoteTreeNode) => React.ReactNode;
}) {
  const sorted = useMemo(() => sortFlat(rows, sort), [rows, sort]);

  return (
    <ul>
      {sorted.map((node) => (
        <li key={node.id}>
          <ExplorerRow
            node={node}
            isActive={node.id === activeId}
            onSelect={onSelect}
            actions={renderActions?.(node)}
          />
        </li>
      ))}
    </ul>
  );
}
