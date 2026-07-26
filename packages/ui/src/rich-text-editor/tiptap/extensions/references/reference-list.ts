import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { ReactNodeViewRenderer } from '@tiptap/react';

import { normalizeReferenceItems } from './numbering';
import { ReferenceListBase } from './reference-list-base';
import { ReferenceListView } from './reference-list-view';
import {
  CITATION_NAME,
  DEFAULT_REFERENCES_TITLE,
  REFERENCE_LIST_NAME,
  type ReferenceItem,
} from './types';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    referenceList: {
      /** Adds a new entry, or replaces the existing one with the same id. */
      upsertReference: (item: ReferenceItem) => ReturnType;
      /** Deletes an entry along with every marker that points at it. */
      removeReference: (id: string) => ReturnType;
      /** Renames the bibliography heading. */
      setReferencesTitle: (title: string) => ReturnType;
    };
  }
}

export function findReferenceList(
  doc: ProseMirrorNode
): { pos: number; node: ProseMirrorNode } | null {
  let found: { pos: number; node: ProseMirrorNode } | null = null;

  doc.descendants((node, pos) => {
    if (found) return false;
    if (node.type.name === REFERENCE_LIST_NAME) found = { pos, node };
    return !found;
  });

  return found;
}

/**
 * Editable bibliography node: the render schema from `reference-list-base.ts`
 * plus the node view and commands, which only the editor needs.
 */
export const ReferenceList = ReferenceListBase.extend({
  addNodeView() {
    return ReactNodeViewRenderer(ReferenceListView);
  },

  addCommands() {
    return {
      upsertReference:
        (item) =>
        ({ state, tr, dispatch }) => {
          if (!item.id) return false;

          const found = findReferenceList(state.doc);

          if (!found) {
            if (dispatch) {
              const type = state.schema.nodes[REFERENCE_LIST_NAME];
              tr.insert(
                state.doc.content.size,
                type.create({ title: DEFAULT_REFERENCES_TITLE, items: [item] })
              );
              dispatch(tr);
            }
            return true;
          }

          const items = normalizeReferenceItems(found.node.attrs.items);
          const index = items.findIndex((entry) => entry.id === item.id);
          const next =
            index === -1
              ? [...items, item]
              : items.map((entry, at) => (at === index ? item : entry));

          if (dispatch) {
            tr.setNodeMarkup(found.pos, undefined, {
              ...found.node.attrs,
              items: next,
            });
            dispatch(tr);
          }

          return true;
        },

      removeReference:
        (id) =>
        ({ state, tr, dispatch }) => {
          const found = findReferenceList(state.doc);
          if (!found) return false;

          const items = normalizeReferenceItems(found.node.attrs.items);
          if (!items.some((entry) => entry.id === id)) return false;

          if (dispatch) {
            const ranges: { from: number; to: number }[] = [];
            state.doc.descendants((node, pos) => {
              if (node.type.name === CITATION_NAME && node.attrs.refId === id) {
                ranges.push({ from: pos, to: pos + node.nodeSize });
              }
              return true;
            });

            // Delete markers back to front so earlier positions stay valid,
            // then map the list position through those deletions.
            for (let i = ranges.length - 1; i >= 0; i -= 1) {
              tr.delete(ranges[i].from, ranges[i].to);
            }

            const listPos = tr.mapping.map(found.pos);
            const remaining = items.filter((entry) => entry.id !== id);

            if (remaining.length) {
              tr.setNodeMarkup(listPos, undefined, {
                ...found.node.attrs,
                items: remaining,
              });
            } else {
              // An empty bibliography should not leave a stray heading behind.
              tr.delete(listPos, listPos + found.node.nodeSize);
            }

            dispatch(tr);
          }

          return true;
        },

      setReferencesTitle:
        (title) =>
        ({ state, tr, dispatch }) => {
          const found = findReferenceList(state.doc);
          if (!found) return false;

          if (dispatch) {
            tr.setNodeMarkup(found.pos, undefined, {
              ...found.node.attrs,
              title: title.trim() || DEFAULT_REFERENCES_TITLE,
            });
            dispatch(tr);
          }

          return true;
        },
    };
  },
});
