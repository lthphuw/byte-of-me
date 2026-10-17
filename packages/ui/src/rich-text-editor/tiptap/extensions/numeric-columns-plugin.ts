import {
  type CellContent,
  type CellSpans,
  findNumericColumns,
  placeCells,
  type PlacedCell,
} from '@byte-of-me/rich-text-schema';
import { Extension } from '@tiptap/core';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { Decoration } from '@tiptap/pm/view';

import {
  incrementalTableDecorations,
  tableDecorationPlugin,
} from './table-decorations';

/**
 * Editor half of the numeric-column rule (render half: `numeric-columns.ts`). Decorations,
 * not a node attribute, so nothing derived reaches the saved document; the incremental
 * bookkeeping lives in `table-decorations.ts`.
 */

const spansOf = (cell: ProseMirrorNode): CellSpans => ({
  colspan: Number(cell.attrs.colspan) || 1,
  rowspan: Number(cell.attrs.rowspan) || 1,
});

const contentOf = (cell: ProseMirrorNode): CellContent => ({
  isHeader: cell.type.name === 'tableHeader',
  text: cell.textContent,
});

/** What the rule works out about one table, both halves of it. */
interface TableColumns {
  /** The columns that hold only figures. */
  columns: Set<number>;
  /**
   * Every cell with the column it occupies. Placed for the whole table at
   * once, so a `rowspan` in an early row still shifts the columns of the rows
   * beneath it.
   */
  placed: PlacedCell<ProseMirrorNode>[][];
}

/**
 * Cached against the table node (persistent: an edit re-reads one table, not all thirty).
 * Placement is cached with the columns, since detection and the caller both need it and
 * placing a 3,738-cell document is ~2.4ms.
 */
const columnCache = new WeakMap<ProseMirrorNode, TableColumns>();

/** A node's children as an array — ProseMirror only offers `forEach`. */
function childrenOf(node: ProseMirrorNode): ProseMirrorNode[] {
  const children: ProseMirrorNode[] = [];
  node.forEach((child) => children.push(child));
  return children;
}

function numericColumnsOf(table: ProseMirrorNode): TableColumns {
  const cached = columnCache.get(table);
  if (cached) return cached;

  const placed = placeCells(childrenOf(table).map(childrenOf), spansOf);
  const entry: TableColumns = {
    columns: findNumericColumns(placed, contentOf),
    placed,
  };
  columnCache.set(table, entry);
  return entry;
}

/** The decorations for one table, at its position in the document. */
function decorationsFor(
  table: ProseMirrorNode,
  tablePos: number
): Decoration[] {
  const { columns, placed } = numericColumnsOf(table);
  if (!columns.size) return [];

  const rows = childrenOf(table);
  const decorations: Decoration[] = [];

  let rowPos = tablePos + 1;
  rows.forEach((row, rowIndex) => {
    let cellPos = rowPos + 1;
    for (const { cell, column, span } of placed[rowIndex]) {
      if (span === 1 && columns.has(column)) {
        decorations.push(
          Decoration.node(cellPos, cellPos + cell.nodeSize, {
            'data-numeric': 'true',
          })
        );
      }
      cellPos += cell.nodeSize;
    }
    rowPos += row.nodeSize;
  });

  return decorations;
}

/** Exported for the spec — `advance` and `buildAll` are the whole behaviour. */
export const numericDecorations = incrementalTableDecorations(decorationsFor);

export const NumericTableColumns = Extension.create({
  name: 'numericTableColumns',

  addProseMirrorPlugins() {
    return [tableDecorationPlugin(this.name, numericDecorations)];
  },
});
