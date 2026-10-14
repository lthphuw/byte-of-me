'use client';

import { useState } from 'react';
import { type Editor, useEditorState } from '@tiptap/react';

import type { SearchAndReplaceStorage } from '../extensions/search-and-replace';

/**
 * The search bar's state and what it asks of the editor. The terms go to the
 * extension from the handlers that change them, not from effects, so opening the
 * bar does not dispatch three empty transactions.
 */
export function useSearchAndReplace(editor: Editor) {
  const [open, setOpen] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [matchCase, setMatchCase] = useState(false);

  // The counter lives in the extension's storage, which a transaction mutates
  // without touching React, so it needs its own subscription.
  const { resultCount, selectedResult } = useEditorState({
    editor,
    selector: ({ editor: current }) => {
      const storage: SearchAndReplaceStorage = current.storage.searchAndReplace;
      return {
        resultCount: storage.results.length,
        selectedResult: storage.selectedResult,
      };
    },
  });

  const changeSearch = (value: string) => {
    setSearchText(value);
    editor.chain().setSearchTerm(value).run();
  };
  const changeReplace = (value: string) => {
    setReplaceText(value);
    editor.chain().setReplaceTerm(value).run();
  };
  const changeMatchCase = (value: boolean) => {
    setMatchCase(value);
    editor.chain().setCaseSensitive(value).run();
  };

  const close = () => {
    setOpen(false);
    setReplacing(false);
    changeSearch('');
    changeReplace('');
  };

  return {
    open,
    toggle: () => (open ? close() : setOpen(true)),
    close,
    replacing,
    setReplacing,
    searchText,
    changeSearch,
    replaceText,
    changeReplace,
    matchCase,
    changeMatchCase,
    resultCount,
    // "0/0" with nothing found, "1/5" on the first of five.
    position: resultCount === 0 ? 0 : selectedResult + 1,
    next: () => editor.chain().selectNextResult().run(),
    previous: () => editor.chain().selectPreviousResult().run(),
    replace: () => editor.chain().replace().run(),
    replaceAll: () => editor.chain().replaceAll().run(),
  };
}
