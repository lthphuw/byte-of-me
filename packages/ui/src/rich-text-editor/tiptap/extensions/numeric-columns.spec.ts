import type { JSONContent } from '@tiptap/core';
import { describe, expect, it } from 'bun:test';

import { markNumericTableColumns } from './numeric-columns';

const cell = (
  text: string,
  type: 'tableCell' | 'tableHeader' = 'tableCell',
  attrs?: Record<string, unknown>
): JSONContent => ({
  type,
  ...(attrs ? { attrs } : {}),
  content: [
    { type: 'paragraph', content: text ? [{ type: 'text', text }] : [] },
  ],
});

const row = (cells: JSONContent[]): JSONContent => ({
  type: 'tableRow',
  content: cells,
});

const table = (rows: JSONContent[]): JSONContent => ({
  type: 'doc',
  content: [{ type: 'table', content: rows }],
});

/** Which columns came back marked, per row. */
function marked(doc: JSONContent): boolean[][] {
  const found = doc.content?.[0];
  return (found?.content ?? []).map((r) =>
    (r.content ?? []).map((c) => Boolean(c.attrs?.numeric))
  );
}

describe('markNumericTableColumns', () => {
  // Alignment is a property of the COLUMN, not of each cell: the header sits
  // right-aligned over its figures, and a blank or a dash keeps the column's
  // edge rather than jumping to the left of it.
  it('marks the whole column, header included, and leaves the label alone', () => {
    const doc = markNumericTableColumns(
      table([
        row([cell('Model', 'tableHeader'), cell('AP', 'tableHeader')]),
        row([cell('YOLOv8'), cell('35.2')]),
        row([cell('RF-DETR'), cell('48.0')]),
      ])
    );

    expect(marked(doc)).toEqual([
      [false, true],
      [false, true],
      [false, true],
    ]);
  });

  it('never marks column 0, even when it holds only numbers', () => {
    // It is the row label — and the column the styles pin.
    const doc = markNumericTableColumns(
      table([
        row([cell('#', 'tableHeader'), cell('AP', 'tableHeader')]),
        row([cell('1'), cell('35.2')]),
        row([cell('2'), cell('48.0')]),
      ])
    );

    expect(marked(doc).slice(1).map((r) => r[0])).toEqual([false, false]);
  });

  it('leaves a column alone when one cell is prose', () => {
    const doc = markNumericTableColumns(
      table([
        row([cell('Model', 'tableHeader'), cell('Notes', 'tableHeader')]),
        row([cell('YOLOv8'), cell('35.2')]),
        row([cell('RF-DETR'), cell('not reported')]),
      ])
    );

    expect(marked(doc).slice(1).map((r) => r[1])).toEqual([false, false]);
  });

  it('accepts the decoration real benchmark tables carry', () => {
    const values = ['3.2M', '21.4', '~5', '60.1', '1,024', '4.4', '82%', '2.3×'];
    const doc = markNumericTableColumns(
      table([
        row([cell('Model', 'tableHeader'), cell('V', 'tableHeader')]),
        ...values.map((value) => row([cell('x'), cell(value)])),
      ])
    );

    expect(marked(doc).slice(1).every((r) => r[1])).toBe(true);
  });

  it('treats blanks and dashes as neither proof nor disproof', () => {
    // The tier-divider rows in a real survey table are exactly this shape.
    const doc = markNumericTableColumns(
      table([
        row([cell('Model', 'tableHeader'), cell('AP', 'tableHeader')]),
        row([cell('— Nano tier —'), cell('')]),
        row([cell('YOLOv8'), cell('35.2')]),
        row([cell('RF-DETR'), cell('—')]),
        row([cell('D-FINE'), cell('42.7')]),
      ])
    );

    // Two figures are enough to call it; the blank and the dash neither prove
    // nor disprove it, and take the column's alignment like everything else.
    expect(marked(doc).slice(1).map((r) => r[1])).toEqual([
      true,
      true,
      true,
      true,
    ]);
  });

  it('needs two figures before it calls a column numeric', () => {
    const doc = markNumericTableColumns(
      table([
        row([cell('Model', 'tableHeader'), cell('AP', 'tableHeader')]),
        row([cell('YOLOv8'), cell('35.2')]),
        row([cell('RF-DETR'), cell('')]),
      ])
    );

    expect(marked(doc).slice(1).map((r) => r[1])).toEqual([false, false]);
  });

  it('keeps columns aligned across a colspan', () => {
    const doc = markNumericTableColumns(
      table([
        row([
          cell('Model', 'tableHeader'),
          cell('Small', 'tableHeader'),
          cell('Large', 'tableHeader'),
        ]),
        // The merged cell covers columns 1 and 2, so it is skipped — but the
        // rows below must still line up against those same two columns.
        row([cell('Group'), cell('spans two', 'tableCell', { colspan: 2 })]),
        row([cell('YOLOv8'), cell('35.2'), cell('49.2')]),
        row([cell('RF-DETR'), cell('48.0'), cell('67.0')]),
      ])
    );

    expect(marked(doc)).toEqual([
      [false, true, true],
      // The merged cell spans two columns, so it takes neither's alignment.
      [false, false],
      [false, true, true],
      [false, true, true],
    ]);
  });

  it('leaves a table too short to judge untouched', () => {
    const rows = [
      row([cell('Model', 'tableHeader'), cell('AP', 'tableHeader')]),
      row([cell('YOLOv8'), cell('35.2')]),
    ];
    const input = table(rows);
    expect(markNumericTableColumns(input)).toEqual(input);
  });

  it('reaches tables nested anywhere in the document', () => {
    const doc = markNumericTableColumns({
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Before' }] },
        {
          type: 'blockquote',
          content: [
            {
              type: 'table',
              content: [
                row([cell('M', 'tableHeader'), cell('AP', 'tableHeader')]),
                row([cell('a'), cell('1.0')]),
                row([cell('b'), cell('2.0')]),
              ],
            },
          ],
        },
      ],
    });

    const nested = doc.content?.[1]?.content?.[0]?.content ?? [];
    expect(nested[2]?.content?.[1]?.attrs?.numeric).toBe(true);
  });

  it('does not mutate the document it was given', () => {
    const input = table([
      row([cell('Model', 'tableHeader'), cell('AP', 'tableHeader')]),
      row([cell('YOLOv8'), cell('35.2')]),
      row([cell('RF-DETR'), cell('48.0')]),
    ]);
    const before = JSON.stringify(input);

    markNumericTableColumns(input);

    expect(JSON.stringify(input)).toBe(before);
  });
});
