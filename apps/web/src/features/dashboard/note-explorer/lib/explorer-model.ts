import type { NoteTreeNode } from '@/entities/note';

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
