import { scrollIntoViewBehavior } from '@byte-of-me/ui-utils';
import { type Editor, Extension, type Range } from '@tiptap/core';
import type { Node as PMNode } from '@tiptap/pm/model';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet, type EditorView } from '@tiptap/pm/view';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    search: {
      setSearchTerm: (searchTerm: string) => ReturnType;
      setReplaceTerm: (replaceTerm: string) => ReturnType;
      setCaseSensitive: (caseSensitive: boolean) => ReturnType;
      /** Replaces the selected match, which then gives way to the next. */
      replace: () => ReturnType;
      replaceAll: () => ReturnType;
      selectNextResult: () => ReturnType;
      selectPreviousResult: () => ReturnType;
    };
  }

  interface Storage {
    searchAndReplace: SearchAndReplaceStorage;
  }
}

export interface SearchAndReplaceStorage {
  searchTerm: string;
  replaceTerm: string;
  caseSensitive: boolean;
  /** Every match in the document, in order; rebuilt by the plugin. */
  results: Range[];
  /** The match "next", "previous" and "replace" act on. Always in range. */
  selectedResult: number;
  // The inputs of the last search, so a transaction that changed none of them
  // keeps its decorations.
  lastSearchTerm: string;
  lastSelectedResult: number;
  lastCaseSensitiveState: boolean;
}

// The term is literal text, never a pattern.
const escapeRegExp = (value: string) =>
  value.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');

function findResults(
  doc: PMNode,
  term: string,
  caseSensitive: boolean
): Range[] {
  const pattern = new RegExp(escapeRegExp(term), caseSensitive ? 'gu' : 'gui');
  const results: Range[] = [];

  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return;
    for (const match of node.text.matchAll(pattern)) {
      if (match.index === undefined || !match[0].trim()) continue;
      results.push({
        from: pos + match.index,
        to: pos + match.index + match[0].length,
      });
    }
  });

  return results;
}

// Classes, not colours: `editor-surface.css` draws them from the theme tokens.
const decorate = (doc: PMNode, results: Range[], selected: number) =>
  DecorationSet.create(
    doc,
    results.map(({ from, to }, index) =>
      Decoration.inline(from, to, {
        class:
          index === selected
            ? 'search-result search-result-selected'
            : 'search-result',
      })
    )
  );

/** `domAtPos` can resolve to a text node, which has no scrollIntoView. */
const scrollResultIntoView = (view: EditorView, from: number) => {
  const { node } = view.domAtPos(from);
  const element = node instanceof Element ? node : node.parentElement;
  element?.scrollIntoView({
    behavior: scrollIntoViewBehavior(),
    block: 'center',
  });
};

/** Moves the selection by one match, wrapping at either end. */
const step = (editor: Editor, delta: 1 | -1) => {
  const storage = editor.storage.searchAndReplace;
  const { length } = storage.results;
  if (length === 0) return;

  storage.selectedResult = (storage.selectedResult + delta + length) % length;
  const result = storage.results[storage.selectedResult];
  if (result && editor.view) scrollResultIntoView(editor.view, result.from);
};

const pluginKey = new PluginKey('searchAndReplacePlugin');

export const SearchAndReplace = Extension.create<
  Record<string, never>,
  SearchAndReplaceStorage
>({
  name: 'searchAndReplace',

  addStorage() {
    return {
      searchTerm: '',
      replaceTerm: '',
      caseSensitive: false,
      results: [],
      selectedResult: 0,
      lastSearchTerm: '',
      lastSelectedResult: 0,
      lastCaseSensitiveState: false,
    };
  },

  addCommands() {
    // Every command reports `false` and dispatches nothing of its own: the plugin
    // reads the storage on the transaction the chain dispatches after it.
    return {
      setSearchTerm:
        (searchTerm) =>
        ({ editor }) => {
          editor.storage.searchAndReplace.searchTerm = searchTerm;
          return false;
        },
      setReplaceTerm:
        (replaceTerm) =>
        ({ editor }) => {
          editor.storage.searchAndReplace.replaceTerm = replaceTerm;
          return false;
        },
      setCaseSensitive:
        (caseSensitive) =>
        ({ editor }) => {
          editor.storage.searchAndReplace.caseSensitive = caseSensitive;
          return false;
        },
      replace:
        () =>
        ({ editor, state, dispatch }) => {
          const { replaceTerm, results, selectedResult } =
            editor.storage.searchAndReplace;
          const target = results[selectedResult];

          if (target && dispatch) {
            dispatch(state.tr.insertText(replaceTerm, target.from, target.to));
          }
          return false;
        },
      replaceAll:
        () =>
        ({ editor, tr, dispatch }) => {
          const { replaceTerm, results } = editor.storage.searchAndReplace;

          // Last to first, so an earlier replacement never moves a later match.
          for (const { from, to } of [...results].reverse()) {
            tr.insertText(replaceTerm, from, to);
          }
          if (results.length > 0 && dispatch) dispatch(tr);
          return false;
        },
      selectNextResult:
        () =>
        ({ editor }) => {
          step(editor, 1);
          return false;
        },
      selectPreviousResult:
        () =>
        ({ editor }) => {
          step(editor, -1);
          return false;
        },
    };
  },

  addProseMirrorPlugins() {
    const { editor } = this;

    return [
      new Plugin({
        key: pluginKey,
        state: {
          init: () => DecorationSet.empty,
          apply({ doc, docChanged }, previous) {
            const storage = editor.storage.searchAndReplace;

            if (
              !docChanged &&
              storage.lastSearchTerm === storage.searchTerm &&
              storage.lastSelectedResult === storage.selectedResult &&
              storage.lastCaseSensitiveState === storage.caseSensitive
            ) {
              return previous;
            }

            storage.lastSearchTerm = storage.searchTerm;
            storage.lastCaseSensitiveState = storage.caseSensitive;

            if (!storage.searchTerm) {
              storage.results = [];
              storage.selectedResult = 0;
              storage.lastSelectedResult = 0;
              return DecorationSet.empty;
            }

            storage.results = findResults(
              doc,
              storage.searchTerm,
              storage.caseSensitive
            );
            // A replacement removes a match, so the index it held can now be
            // past the end.
            storage.selectedResult = Math.min(
              storage.selectedResult,
              Math.max(storage.results.length - 1, 0)
            );
            storage.lastSelectedResult = storage.selectedResult;

            return decorate(doc, storage.results, storage.selectedResult);
          },
        },
        props: {
          decorations(state) {
            return this.getState(state);
          },
        },
      }),
    ];
  },
});
