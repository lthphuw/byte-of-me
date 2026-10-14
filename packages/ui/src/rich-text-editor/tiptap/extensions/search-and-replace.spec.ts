/**
 * Search and replace against a real editor: what the matches are, which one is
 * selected, and what "replace" acts on. The plugin recomputes on a transaction,
 * so each step dispatches an empty one to read the result.
 */
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { afterEach, describe, expect, it } from 'bun:test';

import { SearchAndReplace } from './search-and-replace';

let editor: Editor;

function open(html: string) {
  editor = new Editor({
    extensions: [StarterKit, SearchAndReplace],
    content: html,
  });
  return editor;
}

const refresh = () => editor.view.dispatch(editor.state.tr);
const storage = () => editor.storage.searchAndReplace;
const text = () => editor.getText();

function search(term: string, caseSensitive = false) {
  editor.commands.setCaseSensitive(caseSensitive);
  editor.commands.setSearchTerm(term);
  refresh();
}

afterEach(() => editor?.destroy());

describe('SearchAndReplace results', () => {
  it('finds every match, ignoring case unless asked', () => {
    open('<p>Cat cat CAT</p>');

    search('cat');
    expect(storage().results).toHaveLength(3);

    search('cat', true);
    expect(storage().results).toHaveLength(1);
  });

  it('takes the term literally, not as a pattern', () => {
    open('<p>a.b axb a.b</p>');

    search('a.b');

    expect(storage().results).toHaveLength(2);
  });

  it('marks every match, and the selected one apart', () => {
    open('<p>one two one two one</p>');
    search('one');
    editor.commands.selectNextResult();
    refresh();

    const all = editor.view.dom.querySelectorAll('.search-result');
    const selected = editor.view.dom.querySelectorAll(
      '.search-result-selected'
    );
    expect(all).toHaveLength(3);
    expect(selected).toHaveLength(1);
  });

  it('clears the matches when the term is emptied', () => {
    open('<p>one one</p>');
    search('one');

    search('');

    expect(storage().results).toHaveLength(0);
    expect(editor.view.dom.querySelectorAll('.search-result')).toHaveLength(0);
  });
});

describe('SearchAndReplace selection', () => {
  it('steps forward and back, wrapping at both ends', () => {
    open('<p>x x x</p>');
    search('x');

    editor.commands.selectNextResult();
    expect(storage().selectedResult).toBe(1);
    editor.commands.selectNextResult();
    editor.commands.selectNextResult();
    expect(storage().selectedResult).toBe(0);
    editor.commands.selectPreviousResult();
    expect(storage().selectedResult).toBe(2);
  });
});

describe('SearchAndReplace replace', () => {
  it('replaces the selected match, not the first', () => {
    open('<p>cat dog cat bird cat</p>');
    search('cat');
    editor.commands.selectNextResult();
    editor.commands.setReplaceTerm('fox');

    editor.commands.replace();

    expect(text()).toBe('cat dog fox bird cat');
  });

  it('keeps the selected index inside the results after replacing the last match', () => {
    open('<p>cat cat cat</p>');
    search('cat');
    editor.commands.selectPreviousResult();
    expect(storage().selectedResult).toBe(2);
    editor.commands.setReplaceTerm('fox');

    editor.commands.replace();

    expect(storage().results).toHaveLength(2);
    expect(storage().selectedResult).toBeLessThanOrEqual(1);
  });

  it('replaces every match whatever the length difference', () => {
    open('<p>a a a</p><p>a</p>');
    search('a');
    editor.commands.setReplaceTerm('longer');

    editor.commands.replaceAll();

    expect(text()).toBe('longer longer longer\n\nlonger');
  });

  it('does nothing when there is no match', () => {
    open('<p>nothing here</p>');
    search('zzz');
    editor.commands.setReplaceTerm('x');

    editor.commands.replace();
    editor.commands.replaceAll();

    expect(text()).toBe('nothing here');
  });
});
