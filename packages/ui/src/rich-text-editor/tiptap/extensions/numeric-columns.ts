import type { JSONContent } from '@tiptap/core';

/**
 * Works out which table columns hold nothing but numbers, so the styles can
 * treat them as numbers: right-aligned, never wrapped, and only as wide as a
 * figure needs.
 *
 * Notion can do this because a database column has a declared type. A table in
 * a document has no such metadata, so the type is inferred here instead, from
 * the cells themselves. It is what turns an eleven-column benchmark table from
 * eleven equal-width columns of wrapped text into a row label and ten tight
 * columns of figures.
 *
 * The rule lives here once and is applied twice — as a render pass over the
 * stored JSON ({@link markNumericTableColumns}, for the published page, the
 * preview and the print views) and as editor decorations
 * (`numeric-columns-plugin.ts`). Two implementations would be free to disagree
 * about the same table, and the author would watch its alignment change when
 * they hit preview.
 *
 * Never stored, in either case: it is derived from the content, so a stored
 * copy would go stale the moment a cell is edited.
 */

/** Values that neither prove nor disprove a numeric column. */
const PLACEHOLDERS = new Set(['', '-', '–', '—', 'n/a', 'na', '?', '.']);

/**
 * A figure, with the decoration such tables actually carry: a leading
 * approximation or comparison sign, thousands separators, and a trailing unit.
 * Deliberately strict about the shape — one wrong match turns a column of
 * prose right-aligned, which looks like a bug rather than a style.
 */
const NUMERIC =
  /^[~<>≈±+-]?\s*\d[\d,_ ]*(\.\d+)?\s*(%|×|x|ms|s|h|M|K|B|G|T|GB|MB|FLOPs|GFLOPs|fps|FPS)?$/i;

/**
 * How much of a cell the two halves of the rule need, split deliberately.
 *
 * Placement needs only the spans. Reading a cell's text is the expensive part
 * — on a ProseMirror node it walks the subtree — and the editor calls
 * `placeCells` on every rebuild while its detection result is cached, so
 * bundling the text into one shape made every keystroke pay for text nobody
 * read. Measured on a thirty-table document: 1.06ms of the 2.42ms placement.
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
 * The columns of a placed table that hold only figures.
 *
 * Column 0 is never one of them: it is the row label — and the column the
 * styles pin — so a label that happens to be a number is still a label.
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
