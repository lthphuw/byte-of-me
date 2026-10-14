import { Extension } from '@tiptap/core';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { Decoration } from '@tiptap/pm/view';

import { eachScopedHeader } from './header-scopes';
import {
  incrementalTableDecorations,
  tableDecorationPlugin,
} from './table-decorations';

/**
 * Editor half of the header-`scope` rule (render half: `ScopedTable`, `render-extensions.ts`).
 * Measured 0 `th[scope]` against 184 `<th>` without it: cells render apart from their table,
 * so a side channel goes stale. Decorations instead; nothing reaches the saved document.
 */

/** The scope decorations for one table, at its position in the document. */
function decorationsFor(
  table: ProseMirrorNode,
  tablePos: number
): Decoration[] {
  const decorations: Decoration[] = [];

  eachScopedHeader(table, (cell, scope, offset) => {
    const from = tablePos + offset;
    decorations.push(Decoration.node(from, from + cell.nodeSize, { scope }));
  });

  return decorations;
}

/** Exported for the spec — the incremental pair is the whole behaviour. */
export const headerScopeDecorations =
  incrementalTableDecorations(decorationsFor);

export const TableHeaderScopes = Extension.create({
  name: 'tableHeaderScopes',

  addProseMirrorPlugins() {
    return [tableDecorationPlugin(this.name, headerScopeDecorations)];
  },
});
