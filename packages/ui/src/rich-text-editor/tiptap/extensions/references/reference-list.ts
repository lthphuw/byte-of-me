import {
  CITATION_NAME,
  DEFAULT_REFERENCES_TITLE,
  normalizeReferenceItems,
  REFERENCE_LIST_NAME,
  type ReferenceItem,
  ReferenceListBase,
} from '@byte-of-me/rich-text-schema';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';

import { type EditorLabels, EMPTY_EDITOR_LABELS } from '../../editor-labels';

import { createReferenceListNodeView } from './reference-list-view';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    referenceList: {
      /** Adds a new entry, or replaces the existing one with the same id. */
      upsertReference: (item: ReferenceItem) => ReturnType;
      /**
       * Upserts a whole batch (a BibTeX paste) in one step: a chain of `upsertReference`
       * would cost one undo step per entry, and the first would create the list node.
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
 * The document's bibliography node, if any. Top-level `doc.forEach`, not `descendants`: the
 * node is always a direct child (commands insert it at `doc.content.size`), and a deep walk
 * covered all 3,738 cells of a thirty-table note on every command.
 */
function findReferenceList(
  doc: ProseMirrorNode
): { pos: number; node: ProseMirrorNode } | null {
  let found: { pos: number; node: ProseMirrorNode } | null = null;

  doc.forEach((node, offset) => {
    if (found) return;
    if (node.type.name === REFERENCE_LIST_NAME) found = { pos: offset, node };
  });

  return found;
}

type ReferenceListOptions = {
  /** The editor's labels, handed to the node view. `createExtensions` sets it. */
  labels: EditorLabels;
};

/**
 * Editable bibliography node: the render schema from `reference-list-base.ts`
 * plus the node view and commands, which only the editor needs.
 */
export const ReferenceList = ReferenceListBase.extend<ReferenceListOptions>({
  addOptions() {
    return { labels: EMPTY_EDITOR_LABELS };
  },

  addNodeView() {
    // A node view receives its node and the editor, not the extension's
    // options, so the labels are read here and handed over.
    const { labels } = this.options;

    return createReferenceListNodeView(labels);
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
