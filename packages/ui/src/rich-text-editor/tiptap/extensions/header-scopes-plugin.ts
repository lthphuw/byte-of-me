import { Extension } from '@tiptap/core';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { Decoration } from '@tiptap/pm/view';

import { eachScopedHeader } from './header-scopes';
import {
  incrementalTableDecorations,
  tableDecorationPlugin,
} from './table-decorations';

/**
 * The editor's half of the header-`scope` rule — the same rule the render pass
 * applies to published HTML (`render-extensions.ts`), so the note's own author
 * reads their document through the same markup a share recipient does.
 *
 * It was the missing half. `ScopedTable` derives the scopes inside
 * `renderHTML`, and `renderHTML` is the SERIALIZER's path: the editor mounts
 * stock `TableKit`, so on the live note at `/space/notes/[id]`
 * `document.querySelectorAll('.ProseMirror th[scope]')` returned 0 against 184
 * `<th>`. Registering the render extensions in the editor would not have fixed
 * it either — prosemirror-view renders and re-renders a cell independently of
 * its parent table, so a side channel the table fills would be empty on the
 * first paint and stale after a row was inserted.
 *
 * Decorations instead, for the reason `numeric-columns-plugin.ts` uses them:
 * the attribute is derived from the document's shape, nothing here reaches the
 * saved document, and the shared machinery re-derives exactly the tables an
 * edit actually changed.
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
