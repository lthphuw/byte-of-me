import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { type Decoration, DecorationSet } from '@tiptap/pm/view';

/**
 * The machinery both table decoration passes run on — numeric columns
 * (`numeric-columns-plugin.ts`) and header scopes (`header-scopes-plugin.ts`).
 *
 * Both derive an attribute from the SHAPE of a table rather than storing it,
 * both therefore have to stay correct across every edit, and both have exactly
 * one interesting property: they must not walk the document's cells on every
 * keystroke. That property is subtle enough to be worth one implementation
 * rather than two — the second copy is where a mapped-forward decoration
 * quietly stops matching a rebuild.
 */

export interface TableDecorations {
  decorations: DecorationSet;
  /** The table nodes the set above is currently correct for. */
  covered: WeakSet<ProseMirrorNode>;
}

/** What one table contributes, given its position in the document. */
export type TableDecorationSource = (
  table: ProseMirrorNode,
  tablePos: number
) => Decoration[];

export interface IncrementalTableDecorations {
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
 * Wraps a per-table decoration rule in the incremental bookkeeping that keeps
 * it off the keystroke path.
 *
 * Rebuilding the whole set on every `docChanged` measured 9.6ms per keystroke
 * on a thirty-table survey note — over half a frame, and most of it spent in
 * `DecorationSet.create` re-sorting ten thousand decorations that had not
 * moved relative to anything. Mapping the existing set forward costs almost
 * nothing, and an edit touches one table.
 *
 * What makes that safe is that ProseMirror nodes are persistent: a transaction
 * that edits one table leaves every other table in the document as the very
 * same object, so node identity is a sound answer to "did this table change".
 * A table that IS the same object had its decorations carried to the right
 * places by the mapping along with everything else; a table that is not gets
 * its range cleared and rebuilt, which is what makes a rule whose answer
 * depends on position — a header row deleted, so the row beneath it becomes
 * the header row — come out right rather than merely relocated.
 *
 * Two passes therefore mean two `tablesIn` walks per transaction, and that is
 * the cost worth stating rather than assuming. Measured on a synthetic
 * thirty-table, 3,630-cell document — the shape of the survey note that
 * motivated all of this — over 200 keystrokes, three runs (2026-08-22,
 * Bun 1.3.10): 0.010–0.013ms for the numeric pass alone, 0.015–0.017ms for
 * both, and inside a table (where one table is genuinely re-derived)
 * 0.141–0.157ms either way, the second pass lost in the noise of the first.
 * The walk itself is 0.006–0.009ms, because it descends into everything EXCEPT
 * a table's interior — which on this document is 98% of its nodes.
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
