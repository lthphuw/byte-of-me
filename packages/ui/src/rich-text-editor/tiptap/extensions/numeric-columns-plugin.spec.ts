import { getSchema, type JSONContent } from '@tiptap/core';
import { Node } from '@tiptap/pm/model';
import { EditorState, type Transaction } from '@tiptap/pm/state';
import type { DecorationSet } from '@tiptap/pm/view';
import { beforeAll, describe, expect, it } from 'bun:test';

import { renderExtensions } from '../render-extensions';

import { numericDecorations } from './numeric-columns-plugin';

/**
 * The incremental path is the whole point of this plugin — and the whole risk.
 * Every test below asserts the same invariant: whatever the edit, carrying the
 * decorations forward must land exactly where rebuilding from scratch would.
 * A drift here is invisible until a column is silently aligned by a rule that
 * no longer applies to it.
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

const benchmarkTable = (): JSONContent => ({
  type: 'table',
  content: [
    row([cell('Model', 'tableHeader'), cell('AP', 'tableHeader')]),
    row([cell('YOLOv8'), cell('35.2')]),
    row([cell('RF-DETR'), cell('48.0')]),
    row([cell('D-FINE'), cell('42.7')]),
  ],
});

function docOf(content: JSONContent[]): Node {
  return Node.fromJSON(schema, { type: 'doc', content });
}

/** Decoration ranges, in document order — the thing that must not drift. */
function ranges(set: DecorationSet, doc: Node): [number, number][] {
  return set
    .find(0, doc.content.size)
    .map((decoration): [number, number] => [decoration.from, decoration.to])
    .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
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
  let carried = numericDecorations.buildAll(state.doc);

  const tr = edit(state);
  state = state.apply(tr);
  carried = numericDecorations.advance(carried, state.doc, tr.mapping);

  const rebuilt = numericDecorations.buildAll(state.doc);

  expect(ranges(carried.decorations, state.doc)).toEqual(
    ranges(rebuilt.decorations, state.doc)
  );

  return { state, carried };
}

const positionOf = (doc: Node, type: string): number => {
  let found = -1;
  doc.descendants((node, pos) => {
    if (found !== -1) return false;
    if (node.type.name === type) found = pos;
    return found === -1;
  });
  return found;
};

describe('numeric column decorations', () => {
  it('decorates the figures of a numeric column and nothing else', () => {
    const doc = docOf([benchmarkTable()]);
    const { decorations } = numericDecorations.buildAll(doc);

    // Header plus three body rows, second column only.
    expect(decorations.find(0, doc.content.size)).toHaveLength(4);

    for (const decoration of decorations.find(0, doc.content.size)) {
      expect(doc.nodeAt(decoration.from)?.textContent).toMatch(
        /^(AP|35\.2|48\.0|42\.7)$/
      );
    }
  });

  it('leaves a table of prose undecorated', () => {
    const doc = docOf([
      {
        type: 'table',
        content: [
          row([cell('Term', 'tableHeader'), cell('Meaning', 'tableHeader')]),
          row([cell('NMS'), cell('Non-maximum suppression')]),
          row([cell('AP'), cell('Average precision')]),
        ],
      },
    ]);

    expect(
      numericDecorations.buildAll(doc).decorations.find(0, doc.content.size)
    ).toHaveLength(0);
  });

  describe('carrying decorations through an edit', () => {
    it('matches a rebuild after typing in prose before the table', () => {
      const doc = docOf([
        { type: 'paragraph', content: [{ type: 'text', text: 'intro' }] },
        benchmarkTable(),
      ]);

      const { carried, state } = expectIncrementalMatchesRebuild(doc, (s) =>
        s.tr.insertText('more ', 1)
      );

      // Not vacuously equal: the decorations really did move.
      expect(ranges(carried.decorations, state.doc)[0][0]).toBeGreaterThan(
        ranges(numericDecorations.buildAll(doc).decorations, doc)[0][0]
      );
    });

    it('matches a rebuild after typing inside a numeric cell', () => {
      const doc = docOf([benchmarkTable()]);
      expectIncrementalMatchesRebuild(doc, (s) => {
        const table = positionOf(s.doc, 'table');
        // Into the first body row's figure.
        return s.tr.insertText('1', table + 12);
      });
    });

    // The case a naive "map the old set forward" gets wrong: the column is no
    // longer numeric, so its decorations must be dropped, not relocated.
    it('drops the column when an edit makes it non-numeric', () => {
      const doc = docOf([benchmarkTable()]);
      const { carried, state } = expectIncrementalMatchesRebuild(doc, (s) => {
        let target = -1;
        s.doc.descendants((node, pos) => {
          if (target === -1 && node.textContent === '35.2') target = pos;
          return target === -1;
        });
        return s.tr.insertText('about ', target + 2);
      });

      expect(carried.decorations.find(0, state.doc.content.size)).toHaveLength(
        0
      );
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
