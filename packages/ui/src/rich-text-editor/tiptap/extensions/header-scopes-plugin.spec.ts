import { getSchema, type JSONContent } from '@tiptap/core';
import { Node } from '@tiptap/pm/model';
import { EditorState, TextSelection, type Transaction } from '@tiptap/pm/state';
import { addColumnAfter, addRowAfter, deleteRow } from '@tiptap/pm/tables';
import type { DecorationSet } from '@tiptap/pm/view';
import { beforeAll, describe, expect, it } from 'bun:test';

import { renderExtensions } from '../render-extensions';

import { headerScopeDecorations } from './header-scopes-plugin';

/**
 * `scope` is a fact about a header cell's POSITION, so every edit that moves a
 * cell between roles has to move its scope with it. The incremental path is
 * what makes that affordable and is therefore also what can get it wrong: a
 * decoration mapped forward through a transaction lands where the cell went,
 * which is exactly the wrong answer when the cell did not move but changed
 * meaning — the header row deleted, so the row beneath becomes the header row.
 *
 * Every test below asserts the same invariant: whatever the edit, carrying the
 * decorations forward must land where rebuilding from scratch would, with the
 * same scope on each. `rich-text-editor.spec.tsx` asserts the resulting DOM;
 * this asserts the bookkeeping underneath it, including the cases the DOM test
 * cannot isolate — a second table inserted before the first, a table deleted.
 */

let schema: ReturnType<typeof getSchema>;

beforeAll(() => {
  schema = getSchema(renderExtensions);
});

const cell = (
  text: string,
  type: 'tableCell' | 'tableHeader' = 'tableCell'
): JSONContent => ({
  type,
  content: [
    { type: 'paragraph', content: text ? [{ type: 'text', text }] : [] },
  ],
});

const row = (cells: JSONContent[]): JSONContent => ({
  type: 'tableRow',
  content: cells,
});

/** A header row, and a `th` row label pinned at the start of every body row. */
const benchmarkTable = (): JSONContent => ({
  type: 'table',
  content: [
    row([
      cell('Model', 'tableHeader'),
      cell('AP', 'tableHeader'),
      cell('FPS', 'tableHeader'),
    ]),
    row([cell('YOLOv8', 'tableHeader'), cell('35.2'), cell('12')]),
    row([cell('RF-DETR', 'tableHeader'), cell('48.0'), cell('25')]),
  ],
});

function docOf(content: JSONContent[]): Node {
  return Node.fromJSON(schema, { type: 'doc', content });
}

/** Every decoration as `cell text → scope`, in document order. */
function scoped(set: DecorationSet, doc: Node): [string, unknown][] {
  return set
    .find(0, doc.content.size)
    .sort((a, b) => a.from - b.from)
    .map((decoration): [string, unknown] => [
      doc.nodeAt(decoration.from)?.textContent ?? '',
      // A node decoration's attributes live on its `type`, which
      // prosemirror-view does not declare — asserted through `unknown` rather
      // than reached for with `any`, because they ARE the output under test:
      // the DOM half is what `rich-text-editor.spec.tsx` reads back.
      (
        decoration as unknown as {
          type: { attrs: Record<string, unknown> };
        }
      ).type.attrs.scope,
    ]);
}

/**
 * Applies `edit`, advances the decorations through it, and asserts the result
 * matches a rebuild of the new document.
 */
function expectIncrementalMatchesRebuild(
  start: Node,
  edit: (state: EditorState) => Transaction
) {
  let state = EditorState.create({ schema, doc: start });
  let carried = headerScopeDecorations.buildAll(state.doc);

  const tr = edit(state);
  state = state.apply(tr);
  carried = headerScopeDecorations.advance(carried, state.doc, tr.mapping);

  const rebuilt = headerScopeDecorations.buildAll(state.doc);

  expect(scoped(carried.decorations, state.doc)).toEqual(
    scoped(rebuilt.decorations, state.doc)
  );

  return { carried, state };
}

/** Puts the cursor in the cell holding `text` — what clicking it would do. */
function cursorIn(state: EditorState, text: string): Transaction {
  let pos = -1;
  state.doc.descendants((node, at) => {
    if (pos !== -1) return false;
    const isCell =
      node.type.name === 'tableCell' || node.type.name === 'tableHeader';
    if (isCell && node.textContent === text) pos = at + 2;
    return pos === -1;
  });
  if (pos === -1) throw new Error(`no cell containing ${text}`);

  return state.tr.setSelection(TextSelection.create(state.tr.doc, pos));
}

/** Runs a prosemirror-tables command from the cell holding `text`. */
function fromCell(
  text: string,
  command: (
    state: EditorState,
    dispatch: (tr: Transaction) => void
  ) => boolean
) {
  return (state: EditorState): Transaction => {
    const placed = state.apply(cursorIn(state, text));

    let result: Transaction | undefined;
    command(placed, (tr) => {
      result = tr;
    });
    if (!result) throw new Error('the table command did not apply');

    // The selection transaction changed no document, so the edit's own
    // mapping is the whole mapping the plugin would be handed.
    return result;
  };
}

describe('table header scope decorations', () => {
  it('scopes the header row by column and the row labels by row', () => {
    const doc = docOf([benchmarkTable()]);

    expect(scoped(headerScopeDecorations.buildAll(doc).decorations, doc)).toEqual(
      [
        ['Model', 'col'],
        ['AP', 'col'],
        ['FPS', 'col'],
        ['YOLOv8', 'row'],
        ['RF-DETR', 'row'],
      ]
    );
  });

  it('leaves a table whose row labels are plain cells alone past the header row', () => {
    // HTML5 dropped `scope` on `td`, and a screen reader does not treat a `td`
    // as a header whatever we put on it — so a `td` row label gets nothing
    // rather than markup that lies.
    const doc = docOf([
      {
        type: 'table',
        content: [
          row([cell('Term', 'tableHeader'), cell('Meaning', 'tableHeader')]),
          row([cell('NMS'), cell('Non-maximum suppression')]),
        ],
      },
    ]);

    expect(scoped(headerScopeDecorations.buildAll(doc).decorations, doc)).toEqual(
      [
        ['Term', 'col'],
        ['Meaning', 'col'],
      ]
    );
  });

  it('scopes nothing in a table with no rows', () => {
    // The rowless table is not hypothetical here — it is what crashed the
    // published render before `ScopedTable` handled it.
    const doc = docOf([{ type: 'table', content: [] }]);

    expect(
      headerScopeDecorations.buildAll(doc).decorations.find(0, doc.content.size)
    ).toHaveLength(0);
  });

  describe('carrying scopes through an edit', () => {
    it('matches a rebuild after typing in prose before the table', () => {
      const doc = docOf([
        { type: 'paragraph', content: [{ type: 'text', text: 'intro' }] },
        benchmarkTable(),
      ]);

      const { carried, state } = expectIncrementalMatchesRebuild(doc, (s) =>
        s.tr.insertText('more ', 1)
      );

      // Not vacuously equal: the decorations really did move.
      expect(carried.decorations.find(0, state.doc.content.size)[0].from).toBe(
        headerScopeDecorations.buildAll(doc).decorations.find(
          0,
          doc.content.size
        )[0].from + 5
      );
    });

    it('scopes the label of a row inserted between body rows', () => {
      const doc = docOf([benchmarkTable()]);
      const { carried, state } = expectIncrementalMatchesRebuild(
        doc,
        fromCell('YOLOv8', addRowAfter)
      );

      // prosemirror-tables copies the cell types of the row it follows, so the
      // new row opens with a `th` — which is a row label, not a column one.
      expect(scoped(carried.decorations, state.doc)).toEqual([
        ['Model', 'col'],
        ['AP', 'col'],
        ['FPS', 'col'],
        ['YOLOv8', 'row'],
        ['', 'row'],
        ['RF-DETR', 'row'],
      ]);
    });

    // The case a decoration mapped forward without rebuilding gets wrong.
    it('re-scopes the row promoted to header row when the header row is deleted', () => {
      const doc = docOf([benchmarkTable()]);
      const { carried, state } = expectIncrementalMatchesRebuild(
        doc,
        fromCell('Model', deleteRow)
      );

      // `YOLOv8` did not move relative to the table, it changed MEANING: it is
      // the header row now, so `row` has to become `col`.
      expect(scoped(carried.decorations, state.doc)).toEqual([
        ['YOLOv8', 'col'],
        ['RF-DETR', 'row'],
      ]);
    });

    it('scopes a column added after the row label', () => {
      const doc = docOf([benchmarkTable()]);
      const { carried, state } = expectIncrementalMatchesRebuild(
        doc,
        fromCell('Model', addColumnAfter)
      );

      expect(scoped(carried.decorations, state.doc)).toEqual([
        ['Model', 'col'],
        ['', 'col'],
        ['AP', 'col'],
        ['FPS', 'col'],
        ['YOLOv8', 'row'],
        ['RF-DETR', 'row'],
      ]);
    });

    it('matches a rebuild after a second table is inserted before the first', () => {
      const doc = docOf([benchmarkTable()]);
      expectIncrementalMatchesRebuild(doc, (s) =>
        s.tr.insert(0, Node.fromJSON(schema, benchmarkTable()))
      );
    });

    it('matches a rebuild after a table is deleted', () => {
      const doc = docOf([
        benchmarkTable(),
        { type: 'paragraph', content: [{ type: 'text', text: 'after' }] },
        benchmarkTable(),
      ]);

      expectIncrementalMatchesRebuild(doc, (s) => {
        const first = s.doc.firstChild;
        if (!first) throw new Error('expected a table');
        return s.tr.delete(0, first.nodeSize);
      });
    });
  });
});
