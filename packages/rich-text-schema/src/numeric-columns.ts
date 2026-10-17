import type { JSONContent } from '@tiptap/core';

/**
 * Infers which table columns hold only numbers (right-aligned, unwrapped, tight). One rule,
 * applied twice: `markNumericTableColumns` over stored JSON (published, preview, print) and
 * editor decorations (`numeric-columns-plugin.ts`). Never stored: derived from the content.
 */

/** Values that neither prove nor disprove a numeric column. */
const PLACEHOLDERS = new Set(['', '-', '–', '—', 'n/a', 'na', '?', '.']);

/**
 * A figure with the decoration such tables carry: a leading sign, thousands separators,
 * a trailing unit. Deliberately strict: one wrong match right-aligns a column of prose.
 */
const NUMERIC =
  /^[~<>≈±+-]?\s*\d[\d,_ ]*(\.\d+)?\s*(%|×|x|ms|s|h|M|K|B|G|T|GB|MB|FLOPs|GFLOPs|fps|FPS)?$/i;

/**
 * Spans and text are split on purpose: placement needs only spans, and reading text walks
 * the subtree. Bundled, every keystroke paid for unread text: 1.06ms of 2.42ms placement
 * on a thirty-table document.
 */
export interface CellSpans {
  colspan: number;
  rowspan: number;
}

export interface CellContent {
  /** True for a `tableHeader` — a heading is a label, never a sample. */
  isHeader: boolean;
  text: string;
}

/** A cell and the column it occupies, once spans have been accounted for. */
export interface PlacedCell<T> {
  cell: T;
  column: number;
  span: number;
}

/**
 * Walks a table's rows into (cell, column) pairs, honouring `colspan` and
 * `rowspan` so a merged cell does not shift every column after it.
 */
export function placeCells<T>(
  rows: T[][],
  spansOf: (cell: T) => CellSpans
): PlacedCell<T>[][] {
  const placed: PlacedCell<T>[][] = [];
  // "row,column" for every slot a rowspan above has already claimed.
  const taken = new Set<string>();

  rows.forEach((row, rowIndex) => {
    const cells: PlacedCell<T>[] = [];
    let column = 0;

    for (const cell of row) {
      while (taken.has(`${rowIndex},${column}`)) column += 1;

      const { colspan, rowspan } = spansOf(cell);
      cells.push({ cell, column, span: colspan });

      for (let r = 1; r < rowspan; r += 1) {
        for (let c = 0; c < colspan; c += 1) {
          taken.add(`${rowIndex + r},${column + c}`);
        }
      }

      column += colspan;
    }

    placed.push(cells);
  });

  return placed;
}

/**
 * The columns of a placed table that hold only figures. Column 0 is never one: it is
 * the row label (the column the styles pin), so a numeric label is still a label.
 */
export function findNumericColumns<T>(
  placed: PlacedCell<T>[][],
  contentOf: (cell: T) => CellContent
): Set<number> {
  // A header and one row prove nothing.
  if (placed.length < 3) return new Set();

  const candidates = new Map<number, { seen: number; numeric: boolean }>();

  placed.slice(1).forEach((cells) => {
    for (const { cell, column, span } of cells) {
      if (column === 0 || span !== 1) continue;

      const content = contentOf(cell);
      if (content.isHeader) continue;

      const text = content.text.trim();
      if (PLACEHOLDERS.has(text.toLowerCase())) continue;

      const entry = candidates.get(column) ?? { seen: 0, numeric: true };
      entry.seen += 1;
      if (!NUMERIC.test(text)) entry.numeric = false;
      candidates.set(column, entry);
    }
  });

  return new Set(
    [...candidates]
      // One figure is a coincidence; two make a column.
      .filter(([, entry]) => entry.numeric && entry.seen >= 2)
      .map(([column]) => column)
  );
}

/** Concatenates the text of a JSON node tree — cell content is marks and text. */
function textOf(node: JSONContent): string {
  if (typeof node.text === 'string') return node.text;
  if (!node.content) return '';
  return node.content.map(textOf).join('');
}

const jsonSpans = (cell: JSONContent): CellSpans => ({
  colspan: Number(cell.attrs?.colspan) || 1,
  rowspan: Number(cell.attrs?.rowspan) || 1,
});

const jsonContent = (cell: JSONContent): CellContent => ({
  isHeader: cell.type === 'tableHeader',
  text: textOf(cell),
});

/** Sets `numeric` on every cell of a column that holds only figures. */
function markTable(table: JSONContent): JSONContent {
  const rows = table.content ?? [];
  const placed = placeCells(
    rows.map((row) => row.content ?? []),
    jsonSpans
  );
  const numericColumns = findNumericColumns(placed, jsonContent);

  if (!numericColumns.size) return table;

  return {
    ...table,
    content: rows.map((row, rowIndex) => ({
      ...row,
      content: placed[rowIndex].map(({ cell, column, span }) =>
        span === 1 && numericColumns.has(column)
          ? { ...cell, attrs: { ...cell.attrs, numeric: true } }
          : cell
      ),
    })),
  };
}

/** Applies {@link markTable} to every table in the document. */
export function markNumericTableColumns(doc: JSONContent): JSONContent {
  const transform = (node: JSONContent): JSONContent => {
    if (node.type === 'table') return markTable(node);
    if (!node.content) return node;
    return { ...node, content: node.content.map(transform) };
  };

  return transform(doc);
}
