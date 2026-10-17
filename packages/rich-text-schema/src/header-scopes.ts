import type { Node as ProseMirrorNode } from '@tiptap/pm/model';

/**
 * Which table header cells carry a `scope`. One rule, applied twice: the render pass
 * (`render-extensions.ts`) and editor decorations (`header-scopes-plugin.ts`). Never
 * stored: it derives from table shape, and a stale `scope` misleads assistive tech.
 */

export type HeaderScope = 'col' | 'row';

/**
 * First-row cells are `col` headers, the first cell of later rows a `row` header; only a
 * `tableHeader` is scoped (HTML5 has no `scope` on `td`). Malformed tables fall through,
 * never throw. `visit` gets the cell's offset from the table node's own position.
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
