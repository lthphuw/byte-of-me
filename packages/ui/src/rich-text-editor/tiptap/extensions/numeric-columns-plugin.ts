import { Extension } from '@tiptap/core';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

import {
  type CellContent,
  type CellSpans,
  findNumericColumns,
  placeCells,
  type PlacedCell,
} from './numeric-columns';

/**
 * The editor's half of the numeric-column rule — the same rule the render pass
 * applies to published HTML (`numeric-columns.ts`), so a table is aligned the
 * same way while it is being written as it will be once it is read.
 *
 * Decorations rather than an attribute on the node: the alignment is derived
 * from the content, and storing it would mean a document whose cells disagree
 * with their own attribute the moment one is edited. Nothing here reaches the
 * saved document.
 */

interface NumericState {
  decorations: DecorationSet;
  /** The table nodes the set above is currently correct for. */
  covered: WeakSet<ProseMirrorNode>;
}

const pluginKey = new PluginKey<NumericState>('numericTableColumns');

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
 * What the rule makes of this table, cached against the table node.
 *
 * ProseMirror nodes are persistent: a transaction that edits one table leaves
 * every other table in the document as the very same object, so keying on node
 * identity means an edit re-reads one table's text rather than all thirty.
 *
 * The PLACEMENT is cached alongside the columns because the two are one piece
 * of work: detection cannot run without placing the cells first, and the caller
 * needs the placement to know which cell it is decorating. Kept apart, a cache
 * MISS placed every cell twice — `placeCells` over a 3,738-cell document is the
 * ~2.4ms measured in `numeric-columns.ts`, so the miss path was paying it
 * twice for one answer.
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
function decorationsFor(table: ProseMirrorNode, tablePos: number): Decoration[] {
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

/** Every table in the document, with its position. Tables never nest. */
function tablesIn(doc: ProseMirrorNode) {
  const tables: { node: ProseMirrorNode; pos: number }[] = [];
  doc.descendants((node, pos) => {
    if (node.type.name !== 'table') return true;
    tables.push({ node, pos });
    // Do not walk the cells — only a table that needs rebuilding pays for that.
    return false;
  });
  return tables;
}

function buildAll(doc: ProseMirrorNode): NumericState {
  const covered = new WeakSet<ProseMirrorNode>();
  const decorations: Decoration[] = [];

  for (const { node, pos } of tablesIn(doc)) {
    covered.add(node);
    decorations.push(...decorationsFor(node, pos));
  }

  return { decorations: DecorationSet.create(doc, decorations), covered };
}

/**
 * Carries the decorations through a transaction, rebuilding only the tables
 * that actually changed.
 *
 * Rebuilding the whole set on every `docChanged` measured 9.6ms per keystroke
 * on a thirty-table survey note — over half a frame, and most of it spent in
 * `DecorationSet.create` re-sorting ten thousand decorations that had not
 * moved relative to anything. Mapping the existing set forward costs almost
 * nothing, and an edit touches one table.
 */
function advance(
  previous: NumericState,
  doc: ProseMirrorNode,
  mapping: Parameters<DecorationSet['map']>[0]
): NumericState {
  let decorations = previous.decorations.map(mapping, doc);
  const covered = new WeakSet<ProseMirrorNode>();

  for (const { node, pos } of tablesIn(doc)) {
    covered.add(node);
    // The same node object as last time: its decorations were carried to the
    // right places by the mapping along with everything else.
    if (previous.covered.has(node)) continue;

    const stale = decorations.find(pos, pos + node.nodeSize);
    if (stale.length) decorations = decorations.remove(stale);

    const fresh = decorationsFor(node, pos);
    if (fresh.length) decorations = decorations.add(doc, fresh);
  }

  return { decorations, covered };
}

/** Exported for the spec — `advance` and `buildAll` are the whole behaviour. */
export const numericDecorations = { buildAll, advance };

export const NumericTableColumns = Extension.create({
  name: 'numericTableColumns',

  addProseMirrorPlugins() {
    return [
      new Plugin<NumericState>({
        key: pluginKey,
        state: {
          init: (_, state) => buildAll(state.doc),
          apply: (tr, previous, __, next) =>
            // Position-only transactions (a selection move, a click) leave the
            // decorations exactly where they were.
            tr.docChanged ? advance(previous, next.doc, tr.mapping) : previous,
        },
        props: {
          decorations: (state) => pluginKey.getState(state)?.decorations,
        },
      }),
    ];
  },
});
