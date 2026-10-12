import { type EditorLabels, EMPTY_EDITOR_LABELS } from '../../editor-labels';

import { CitationBase } from './citation-base';
import { createCitationNodeView } from './citation-view';
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

type CitationOptions = {
  /** The editor's labels, handed to the node view. `createExtensions` sets it. */
  labels: EditorLabels;
};

/**
 * Editable citation node: the render schema from `citation-base.ts` plus the
 * node view and commands, which only the editor needs.
 */
export const Citation = CitationBase.extend<CitationOptions>({
  addOptions() {
    return { labels: EMPTY_EDITOR_LABELS };
  },

  addNodeView() {
    // A node view receives its node and the editor, not the extension's
    // options, so the labels are read here and handed over.
    const { labels } = this.options;

    return createCitationNodeView(labels);
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
            if (
              node.type.name === CITATION_NAME &&
              node.attrs.refId === refId
            ) {
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
