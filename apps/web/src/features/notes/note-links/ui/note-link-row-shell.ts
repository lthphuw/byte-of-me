import type { CSSProperties } from 'react';

/**
 * The ONE definition of a links-panel row's indent.
 *
 * Three things now draw something at the same level of the outgoing tree: the
 * branch row itself, the placeholder rows an expanding branch shows, and the
 * error line a failed expansion leaves behind. `note-row-shell.ts` records what
 * happens when those copies live apart — the tree's placeholder ended up 8px
 * short, in no column at all, and never read as an arriving child.
 *
 * The step is 12px and NOT `noteRowIndent`'s: that one adds a 4px base for the
 * explorer's own gutter, which this panel does not have. Sharing the number
 * rather than the component, for the same reason `note-row-shell.ts` gives —
 * the three differ completely in what they contain and in which of them is
 * interactive. What they must agree on is the column.
 */
const INDENT_STEP = 12;

export function noteLinkIndent(depth: number): CSSProperties {
  return { paddingLeft: `${depth * INDENT_STEP}px` };
}
