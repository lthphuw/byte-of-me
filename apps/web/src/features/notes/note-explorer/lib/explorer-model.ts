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

/** Where a new row goes, and what has to open for it to be visible. */
export interface CreateTarget {
  /** The level the new note or folder is created in. `null` is the root. */
  parentId: string | null;
  /** A collapsed folder that must expand before the draft row can be seen. */
  expandId: string | null;
}

/**
 * Where `n` / `Shift+N` / "New note" puts the new row.
 *
 * VSCode's rule, and the one the author asked for: a selected FOLDER receives
 * the new row, a selected NOTE gets a new sibling. Creating *inside* a note
 * would be defensible — the tree is one hierarchy and any row can hold children
 * — but it is not what a file explorer does, and it would make "new note" mean
 * two different things depending on what happened to be selected.
 *
 * No selection falls back to the root, which is what both header buttons did
 * unconditionally before this existed.
 */
export function resolveCreateTarget(
  selected: NoteTreeNode | null
): CreateTarget {
  if (!selected) return { parentId: null, expandId: null };

  if (selected.isFolder) {
    return { parentId: selected.id, expandId: selected.id };
  }

  // A visible note's parent is expanded by definition — the note could not be
  // on screen otherwise — so there is nothing to open.
  return { parentId: selected.parentId, expandId: null };
}

/** One row as the tree is drawing it: the node plus the depth it sits at. */
export interface VisibleRow {
  node: NoteTreeNode;
  depth: number;
}

/**
 * Every row currently on screen, in screen order.
 *
 * This is what arrow-key navigation moves through. Deriving it rather than
 * registering DOM nodes is the whole reason the keyboard model is testable: the
 * tree is drawn by a component that recurses and fetches its own level, so
 * there is no single place that knows the running order — but the cache does,
 * and `expandedIds` says which parts of it are being shown.
 *
 * `childrenOf` is passed in rather than reading TanStack directly so this stays
 * a pure function. The panel supplies the cache read; a test supplies a Map.
 * It returns `undefined` for a folder whose level has not been fetched yet,
 * which is a real state — an expanded folder mid-flight contributes its own row
 * and no children.
 */
export function flattenVisibleRows(
  rootRows: readonly NoteTreeNode[],
  expandedIds: ReadonlySet<string>,
  childrenOf: (parentId: string) => readonly NoteTreeNode[] | undefined
): VisibleRow[] {
  const out: VisibleRow[] = [];
  // A `parentId` cycle cannot be created through the UI, but this walk follows
  // whatever the cache holds and a cycle here would hang the browser rather
  // than render wrongly. Cheap insurance on a hot path that already allocates.
  const seen = new Set<string>();

  const walk = (rows: readonly NoteTreeNode[], depth: number) => {
    for (const node of rows) {
      if (seen.has(node.id)) continue;
      seen.add(node.id);
      out.push({ node, depth });

      if (!expandedIds.has(node.id)) continue;
      const children = childrenOf(node.id);
      if (children?.length) walk(children, depth + 1);
    }
  };

  walk(rootRows, 0);
  return out;
}

/** The four keys `navigate` answers for. */
export type ArrowKey = 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight';

/**
 * What an arrow key asks the tree to do. Every field is optional and an empty
 * object means "nothing" — the caller applies whichever fields are present.
 *
 * Returning intent instead of mutating is what lets the whole keyboard model be
 * tested as a table of inputs and expectations, with no tree rendered and no
 * focus simulated.
 */
export interface NavigationIntent {
  selectId?: string;
  expandId?: string;
  collapseId?: string;
}

/**
 * The VSCode explorer's arrow-key behaviour, as a pure function.
 *
 * Right is two-stage on a folder — open it, then step into it — which is what
 * makes a deep tree walkable without ever reaching for the mouse. Left is the
 * mirror: close it, or climb out of it. Up and down clamp rather than wrap;
 * wrapping in a file list loses the reader's place.
 */
export function navigate(
  key: ArrowKey,
  rows: readonly VisibleRow[],
  selectedId: string | null,
  expandedIds: ReadonlySet<string>
): NavigationIntent {
  if (rows.length === 0) return {};

  const index = rows.findIndex((row) => row.node.id === selectedId);

  // Nothing selected: any arrow key adopts the first row rather than doing
  // nothing, so a fresh keyboard user is never stuck.
  if (index === -1) {
    const first = rows[0];
    return first ? { selectId: first.node.id } : {};
  }

  const current = rows[index];
  if (!current) return {};
  const node = current.node;

  switch (key) {
    case 'ArrowDown': {
      const next = rows[index + 1];
      return next ? { selectId: next.node.id } : {};
    }
    case 'ArrowUp': {
      const previous = rows[index - 1];
      return previous ? { selectId: previous.node.id } : {};
    }
    case 'ArrowRight': {
      if (node.childCount === 0) return {};
      if (!expandedIds.has(node.id)) return { expandId: node.id };
      // Already open: step to the first child, which — because `rows` is in
      // screen order — is simply the row after this one.
      const child = rows[index + 1];
      return child && child.depth > current.depth
        ? { selectId: child.node.id }
        : {};
    }
    case 'ArrowLeft': {
      if (node.childCount > 0 && expandedIds.has(node.id)) {
        return { collapseId: node.id };
      }
      // Climb out. Scanning backwards for the nearest shallower row finds the
      // parent without needing `parentId` to be present in this level's rows —
      // and at depth 0 there is nothing shallower, so this correctly does
      // nothing.
      for (let i = index - 1; i >= 0; i -= 1) {
        const candidate = rows[i];
        if (candidate && candidate.depth < current.depth) {
          return { selectId: candidate.node.id };
        }
      }
      return {};
    }
  }
}

export interface ExplorerGroup {
  /** Stable key for React and for DnD drop targets. */
  key: string;
  /** What the section header shows — a label name or a status token. */
  title: string;
  /** Set when the group IS a label — drops need the id, not the name. */
  labelId?: string;
  rows: NoteTreeNode[];
}
