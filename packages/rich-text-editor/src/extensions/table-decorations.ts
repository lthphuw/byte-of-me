import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { type Decoration, DecorationSet } from '@tiptap/pm/view';

/**
 * Machinery shared by the numeric-column and header-scope passes: derive an attribute
 * from table shape without walking every cell per keystroke. One copy, so a mapped-forward
 * decoration cannot drift from a rebuild.
 */

interface TableDecorations {
  decorations: DecorationSet;
  /** The table nodes the set above is currently correct for. */
  covered: WeakSet<ProseMirrorNode>;
}

/** What one table contributes, given its position in the document. */
type TableDecorationSource = (
  table: ProseMirrorNode,
  tablePos: number
) => Decoration[];

interface IncrementalTableDecorations {
  buildAll(doc: ProseMirrorNode): TableDecorations;
  advance(
    previous: TableDecorations,
    doc: ProseMirrorNode,
    mapping: Parameters<DecorationSet['map']>[0]
  ): TableDecorations;
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

/**
 * Incremental: map the set forward, rebuild only tables whose node object changed. Measured
 * (30 tables, 3,630 cells, 200 keys, Bun 1.3.10): full rebuild 9.6ms/key vs 0.015ms, 0.15ms
 * inside a table; the `tablesIn` walk is 0.006-0.009ms, so two passes cost nothing visible.
 */
export function incrementalTableDecorations(
  decorationsFor: TableDecorationSource
): IncrementalTableDecorations {
  function buildAll(doc: ProseMirrorNode): TableDecorations {
    const covered = new WeakSet<ProseMirrorNode>();
    const decorations: Decoration[] = [];

    for (const { node, pos } of tablesIn(doc)) {
      covered.add(node);
      decorations.push(...decorationsFor(node, pos));
    }

    return { decorations: DecorationSet.create(doc, decorations), covered };
  }

  function advance(
    previous: TableDecorations,
    doc: ProseMirrorNode,
    mapping: Parameters<DecorationSet['map']>[0]
  ): TableDecorations {
    let decorations = previous.decorations.map(mapping, doc);
    const covered = new WeakSet<ProseMirrorNode>();

    for (const { node, pos } of tablesIn(doc)) {
      covered.add(node);
      if (previous.covered.has(node)) continue;

      const stale = decorations.find(pos, pos + node.nodeSize);
      if (stale.length) decorations = decorations.remove(stale);

      const fresh = decorationsFor(node, pos);
      if (fresh.length) decorations = decorations.add(doc, fresh);
    }

    return { decorations, covered };
  }

  return { buildAll, advance };
}

/**
 * The ProseMirror plugin around one such rule. Position-only transactions (a
 * selection move, a click) leave the decorations exactly where they were.
 */
export function tableDecorationPlugin(
  name: string,
  { advance, buildAll }: IncrementalTableDecorations
): Plugin<TableDecorations> {
  const key = new PluginKey<TableDecorations>(name);

  return new Plugin<TableDecorations>({
    key,
    state: {
      init: (_, state) => buildAll(state.doc),
      apply: (tr, previous, __, next) =>
        tr.docChanged ? advance(previous, next.doc, tr.mapping) : previous,
    },
    props: {
      decorations: (state) => key.getState(state)?.decorations,
    },
  });
}
