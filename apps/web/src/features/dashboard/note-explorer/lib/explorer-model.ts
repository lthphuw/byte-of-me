import type { NoteLabelSummary, NoteTreeNode } from '@/entities/note';

export type ExplorerMode = 'tree' | 'flat' | 'grouped';
export type FlatSort = 'updated' | 'created' | 'title';
export type GroupBy = 'status' | 'label';

/** What the view menu hands back — any subset of the three prefs. */
export type ExplorerPrefsUpdate = Partial<{
  mode: ExplorerMode;
  sort: FlatSort;
  groupBy: GroupBy;
}>;

export interface ExplorerGroup {
  /** Stable key for React and for DnD drop targets. */
  key: string;
  /** What the section header shows — a label name or a status token. */
  title: string;
  /** Set when the group IS a label — drops need the id, not the name. */
  labelId?: string;
  rows: NoteTreeNode[];
}

/** The grouped view's "everything else" buckets. */
export const NO_LABEL_GROUP_KEY = 'no-label';

/** Pure. Pinned first (parity with the tree), then the chosen order. */
export function sortFlat(rows: NoteTreeNode[], sort: FlatSort): NoteTreeNode[] {
  const sorted = [...rows];
  sorted.sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    switch (sort) {
      case 'updated':
        return b.updatedAt.getTime() - a.updatedAt.getTime();
      case 'created':
        return b.createdAt.getTime() - a.createdAt.getTime();
      case 'title':
        return a.title.localeCompare(b.title) || a.id.localeCompare(b.id);
    }
  });
  return sorted;
}

/**
 * Pure. `status`: one bucket per distinct status, in first-seen row order —
 * the author's own vocabulary, not a hardcoded list. `label`: one bucket per
 * label that HAS rows (label-name order), a row with two labels appears in
 * both, and unlabeled rows land in a final "no label" bucket whose title the
 * CALLER localizes (this module stays i18n-free).
 */
export function groupRows(
  rows: NoteTreeNode[],
  by: GroupBy,
  labels: NoteLabelSummary[],
  noLabelTitle: string
): ExplorerGroup[] {
  if (by === 'status') {
    const buckets = new Map<string, NoteTreeNode[]>();
    for (const row of rows) {
      const bucket = buckets.get(row.status);
      if (bucket) {
        bucket.push(row);
      } else {
        buckets.set(row.status, [row]);
      }
    }
    return [...buckets.entries()].map(([status, bucketRows]) => ({
      key: `status:${status}`,
      title: status,
      rows: bucketRows,
    }));
  }

  const byLabel = new Map(labels.map((label) => [label.id, label]));
  const buckets = new Map<string, NoteTreeNode[]>();
  const unlabeled: NoteTreeNode[] = [];
  for (const row of rows) {
    const known = row.labelIds.filter((id) => byLabel.has(id));
    if (known.length === 0) {
      unlabeled.push(row);
      continue;
    }
    for (const labelId of known) {
      const bucket = buckets.get(labelId);
      if (bucket) {
        bucket.push(row);
      } else {
        buckets.set(labelId, [row]);
      }
    }
  }

  const groups: ExplorerGroup[] = labels
    .filter((label) => buckets.has(label.id))
    .map((label) => ({
      key: `label:${label.id}`,
      title: label.name,
      labelId: label.id,
      rows: buckets.get(label.id) ?? [],
    }));
  if (unlabeled.length > 0) {
    groups.push({
      key: NO_LABEL_GROUP_KEY,
      title: noLabelTitle,
      rows: unlabeled,
    });
  }
  return groups;
}
