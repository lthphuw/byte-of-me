import { InputRule } from '@tiptap/core';
import { BlockMath, InlineMath } from '@tiptap/extension-mathematics';

/**
 * `@tiptap/extension-mathematics` ships input rules with its own convention:
 * `$$…$$` becomes INLINE math and `$$$…$$$` becomes a block. The notes spec
 * (and every markdown editor an author will have used — Obsidian, Typora,
 * Jupyter) says `$…$` inline and `$$…$$` block, so both nodes are re-exported
 * here with their input rules replaced. Rendering, commands, node views and
 * the `katexOptions` plumbing are inherited unchanged.
 */

export const NotesInlineMath = InlineMath.extend({
  addInputRules() {
    return [
      new InputRule({
        // Single dollars, converted as the closing `$` is typed. The
        // whitespace guards are what keep "costs $5 and $10 more" from
        // turning `5 and ` into a formula: an opening `$` must not be
        // followed by a space, a closing one must not be preceded by one —
        // the same heuristic Obsidian uses for currency text.
        find: /(?<!\$)\$(?!\s)([^$\n]+?)(?<!\s)\$(?!\$)/,
        handler: ({ state, range, match }) => {
          const [, latex] = match;
          state.tr.replaceWith(
            range.from,
            range.to,
            this.type.create({ latex: latex.trim() })
          );
        },
      }),
    ];
  },
});

export const NotesBlockMath = BlockMath.extend({
  addInputRules() {
    return [
      new InputRule({
        // `$$…$$` alone on a line. Anchored, so a double-dollar mid-sentence
        // stays literal text — display math belongs on its own line.
        find: /^\$\$([^$\n]+?)\$\$$/,
        handler: ({ state, range, match }) => {
          const [, latex] = match;
          const { tr } = state;
          const $from = state.doc.resolve(range.from);
          const node = this.type.create({ latex: latex.trim() });
          // Verbatim from the upstream `$$$` rule: when the match spans the
          // whole host textblock, replace the BLOCK (so no empty paragraph is
          // left behind), falling back to an in-place range replace.
          const consumesHostTextblock =
            $from.depth > 0 &&
            $from.parent.isTextblock &&
            range.from === $from.start() &&
            range.to === $from.end();
          const canReplaceHostTextblock =
            consumesHostTextblock &&
            $from
              .node(-1)
              .canReplaceWith($from.index(-1), $from.indexAfter(-1), this.type);
          const replacementRange = canReplaceHostTextblock
            ? { from: $from.before(), to: $from.after() }
            : range;
          tr.replaceWith(replacementRange.from, replacementRange.to, node);
        },
      }),
    ];
  },
});
