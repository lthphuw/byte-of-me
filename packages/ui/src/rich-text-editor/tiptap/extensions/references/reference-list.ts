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
      /**
       * Upserts a whole batch — what a BibTeX paste produces — in one step.
       *
       * Not a chain of `upsertReference`: each of those is its own transaction,
       * so importing twelve entries would cost twelve undo steps, and the first
       * would have to create the list node the other eleven then read back.
       */
      importReferences: (items: ReferenceItem[]) => ReturnType;
      /** Deletes an entry along with every marker that points at it. */
      removeReference: (id: string) => ReturnType;
      /** Renames the bibliography heading. */
      setReferencesTitle: (title: string) => ReturnType;
    };
  }
}

/**
 * The document's bibliography node, if it has one.
 *
 * `doc.forEach` over the top-level children, not `doc.descendants`: the node is
 * always a direct child of the doc — every command below inserts it at
 * `doc.content.size` — so a deep walk can only ever confirm what the shallow one
 * already knows. It was one, and it cost: `descendants` treats a falsy return as
 * "no opinion" and recurses anyway, and the previous callback returned `!found`,
 * i.e. `true` for every non-match. So a note with thirty tables walked all 3,738
 * cells (and their paragraphs, and their text nodes) looking for a top-level
 * node, on every `upsertReference` / `removeReference` / `setReferencesTitle`,
 * and on every one of the twelve lookups a BibTeX import used to make.
 */
export function findReferenceList(
  doc: ProseMirrorNode
): { pos: number; node: ProseMirrorNode } | null {
  let found: { pos: number; node: ProseMirrorNode } | null = null;

  doc.forEach((node, offset) => {
    if (found) return;
    if (node.type.name === REFERENCE_LIST_NAME) found = { pos: offset, node };
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

      importReferences:
        (items) =>
        ({ state, tr, dispatch }) => {
          const incoming = items.filter((item) => item.id && item.title);
          if (!incoming.length) return false;

          const found = findReferenceList(state.doc);

          if (!found) {
            if (dispatch) {
              const type = state.schema.nodes[REFERENCE_LIST_NAME];
              tr.insert(
                state.doc.content.size,
                type.create({
                  title: DEFAULT_REFERENCES_TITLE,
                  items: incoming,
                })
              );
              dispatch(tr);
            }
            return true;
          }

          // An entry keeps its position when re-imported: a `.bib` pasted a
          // second time is a correction, not a reordering, and moving the
          // entry would renumber every citation after it.
          const next = normalizeReferenceItems(found.node.attrs.items);
          for (const item of incoming) {
            const index = next.findIndex((entry) => entry.id === item.id);
            if (index === -1) next.push(item);
            else next[index] = item;
          }

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
