import { ReactNodeViewRenderer } from '@tiptap/react';

import { CitationBase } from './citation-base';
import { CitationView } from './citation-view';
import { CITATION_NAME } from './types';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    citation: {
      /** Inserts a `[n]` marker for `refId` at the current selection. */
      insertCitation: (refId: string) => ReturnType;
      /** Removes every marker pointing at `refId`. */
      removeCitations: (refId: string) => ReturnType;
    };
  }
}

/**
 * Editable citation node: the render schema from `citation-base.ts` plus the
 * node view and commands, which only the editor needs.
 */
export const Citation = CitationBase.extend({
  addNodeView() {
    return ReactNodeViewRenderer(CitationView, { as: 'span' });
  },

  addCommands() {
    return {
      insertCitation:
        (refId) =>
        ({ commands }) => {
          if (!refId) return false;
          return commands.insertContent({
            type: CITATION_NAME,
            attrs: { refId },
          });
        },

      removeCitations:
        (refId) =>
        ({ state, tr, dispatch }) => {
          const ranges: { from: number; to: number }[] = [];

          state.doc.descendants((node, pos) => {
            if (node.type.name === CITATION_NAME && node.attrs.refId === refId) {
              ranges.push({ from: pos, to: pos + node.nodeSize });
            }
            return true;
          });

          if (!ranges.length) return false;
          if (dispatch) {
            // Delete back to front so earlier positions stay valid.
            for (let i = ranges.length - 1; i >= 0; i -= 1) {
              tr.delete(ranges[i].from, ranges[i].to);
            }
            dispatch(tr);
          }

          return true;
        },
    };
  },
});
