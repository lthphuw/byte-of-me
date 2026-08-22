import type { Node as ProseMirrorNode } from '@tiptap/pm/model';

/**
 * Which header cells of a table carry a `scope`, and which one.
 *
 * The rule lives here once and is applied twice — as a side channel the
 * published serializer reads (`render-extensions.ts`) and as editor
 * decorations (`header-scopes-plugin.ts`) — for the same reason the numeric
 * column rule is split that way: two implementations would be free to disagree
 * about the same table, and the author would watch the markup change when they
 * hit preview.
 *
 * Never stored, in either case. `scope` is derived from the SHAPE of the
 * table, so a stored copy goes stale the moment a row is inserted or the
 * header row is deleted — and a scope that is right on first render and wrong
 * after an edit is worse than none: it tells assistive tech, with authority,
 * which header a number belongs to, and is lying.
 */

export type HeaderScope = 'col' | 'row';

/**
 * The document structure these tables actually have — the same one
 * `editor-surface.css` styles: the FIRST ROW is the header row, and the FIRST
 * CELL of every row is the row label (the column the styles pin).
 *
 * So the first row's cells are column headers, and the first cell of every
 * later row is a row header. The top-left corner belongs to the first row and
 * is scoped `col` there, never both.
 *
 * Only a `tableHeader` is scoped. Whether a row label is a `th` at all is the
 * author's choice, and HTML has no `scope` on a `td` — it was dropped in
 * HTML5, and a screen reader does not treat a `td` as a header no matter what
 * we put on it. A `td` row label therefore gets nothing rather than invalid
 * markup.
 *
 * Nothing here assumes a well-formed table: a row with no cells and a table
 * with no rows both fall through, because a malformed table must still render
 * — `generateHTML` throwing costs the reader the whole document, not one
 * table.
 *
 * `visit` is handed the cell, its scope, and its offset from the TABLE NODE's
 * own position, so a caller that decorates can turn it into a document
 * position with one addition. Past the header row only the first cell is
 * looked at, which is what keeps this proportional to
 * (header row + rows) rather than to every cell in the table.
 */
export function eachScopedHeader(
  table: ProseMirrorNode,
  visit: (cell: ProseMirrorNode, scope: HeaderScope, offset: number) => void
): void {
  table.forEach((row, rowOffset, rowIndex) => {
    // +2: one to step into the table's content, one to step into the row's.
    const cellBase = rowOffset + 2;

    if (rowIndex === 0) {
      row.forEach((cell, cellOffset) => {
        if (cell.type.name === 'tableHeader')
          visit(cell, 'col', cellBase + cellOffset);
      });
      return;
    }

    const label = row.firstChild;
    if (label?.type.name === 'tableHeader') visit(label, 'row', cellBase);
  });
}
