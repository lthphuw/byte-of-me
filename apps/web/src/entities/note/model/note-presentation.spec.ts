/**
 * `stripStoredPresentation` edits the source of truth with no undo, so what it
 * removes is a contract — and so is what it COUNTS, because `changed === 0` is
 * the whole reason a note is not written and not restamped.
 *
 * The counting half is what this file exists for. A read-only audit of the
 * vault looked for attributes carrying a colour and called 6 notes dirty; the
 * job then rewrote 11. The ones it missed are presentation with no colour to
 * find: Tiptap keeps a parsed attribute unless it is `null`/`undefined`, so a
 * `<span style="font-weight:700">` is stored as `textStyle` with `color: ''`
 * and a plain `<mark>` as `highlight` with `color: ''`.
 *
 * The two are treated differently on purpose, and that asymmetry is the point
 * of half the cases below: the mark is removed and counted, the attribute is
 * left alone. `''` and `null` render the same highlight, so normalising one to
 * the other would buy a write and an `@updatedAt` bump — and the flat view
 * sorts on `updatedAt` — for a document nobody can see the difference in.
 */
import { describe, expect, it } from 'bun:test';

import { stripStoredPresentation } from './note-presentation';

type Mark = Record<string, unknown>;

/** A one-paragraph document whose single text node carries `marks`. */
function docWithMarks(...marks: Mark[]): string {
  return JSON.stringify({
    type: 'doc',
    content: [
      { type: 'paragraph', content: [{ type: 'text', text: 'cell', marks }] },
    ],
  });
}

/** The marks left on that text node — `undefined` once the key is dropped. */
function marksOf(content: string): Mark[] | undefined {
  const doc = JSON.parse(content) as {
    content: [{ content: [{ marks?: Mark[] }] }];
  };
  return doc.content[0].content[0].marks;
}

/** A one-cell table whose cell carries `attrs`. */
function docWithCell(attrs: Mark): string {
  return JSON.stringify({
    type: 'doc',
    content: [
      {
        type: 'table',
        content: [
          {
            type: 'tableRow',
            content: [{ type: 'tableCell', attrs, content: [] }],
          },
        ],
      },
    ],
  });
}

/** That cell's attributes, read back. */
function cellAttrs(content: string): Mark {
  const doc = JSON.parse(content) as {
    content: [{ content: [{ content: [{ attrs: Mark }] }] }];
  };
  return doc.content[0].content[0].content[0].attrs;
}

/**
 * Every shape a `textStyle` mark takes when the source `<span style>` said
 * nothing about colour. `color: ''` is the one real data actually holds — the
 * others are what the same span produces once an editor version stops writing
 * the attribute at all.
 */
const COLOURLESS_TEXT_STYLE: Mark[] = [
  { type: 'textStyle', attrs: { color: '' } },
  { type: 'textStyle', attrs: {} },
  { type: 'textStyle' },
  { type: 'textStyle', attrs: null },
  { type: 'textStyle', attrs: { color: null } },
];

describe('stripStoredPresentation', () => {
  it.each(COLOURLESS_TEXT_STYLE)(
    'strips and counts a textStyle mark with no colour to find — the 6-vs-11 audit gap (%o)',
    (mark) => {
      // The mark goes because the mark itself is the presentation, not the
      // attribute on it. An audit that hunts colours sees nothing here, which
      // is exactly why it undercounted the notes this job rewrote.
      const result = stripStoredPresentation(docWithMarks(mark));

      expect(result.changed).toBe(1);
      expect(marksOf(result.content)).toBeUndefined();
    }
  );

  it('strips a textStyle mark that does carry the source’s colour', () => {
    const result = stripStoredPresentation(
      docWithMarks({ type: 'textStyle', attrs: { color: '#073763' } })
    );

    expect(result.changed).toBe(1);
    expect(marksOf(result.content)).toBeUndefined();
  });

  it('leaves other marks standing and drops the key only when none is left', () => {
    // Tiptap omits `marks` entirely on an unmarked node, so a document this
    // job rewrote has to be indistinguishable from one the editor wrote.
    const kept = stripStoredPresentation(
      docWithMarks({ type: 'bold' }, { type: 'textStyle', attrs: {} })
    );

    expect(kept.changed).toBe(1);
    expect(marksOf(kept.content)).toEqual([{ type: 'bold' }]);
  });

  it('does not rewrite a note for an empty attribute that renders as its default', () => {
    // A plain `<mark>` parses to `color: ''`, which paints exactly what `null`
    // paints. Normalising it would cost the note a write and an `@updatedAt`
    // bump — and the flat view sorts on `updatedAt` — for no visible change.
    const highlighted = docWithMarks({
      type: 'highlight',
      attrs: { color: '' },
    });
    const linked = docWithMarks({
      type: 'link',
      attrs: { href: '/space/notes/a', class: '' },
    });

    expect(stripStoredPresentation(highlighted).changed).toBe(0);
    expect(stripStoredPresentation(highlighted).content).toBe(highlighted);
    expect(stripStoredPresentation(linked).changed).toBe(0);
    expect(stripStoredPresentation(linked).content).toBe(linked);
  });

  it('removes an empty textStyle mark but keeps an empty highlight colour', () => {
    // The asymmetry is deliberate. An empty `textStyle` is a mark with no
    // rendered effect at all and `stripPastedPresentation` stops new ones
    // arriving, so clearing the stored ones converges; an empty `highlight`
    // colour is a live mark's attribute and normalising it never would.
    const result = stripStoredPresentation(
      docWithMarks(
        { type: 'textStyle', attrs: { color: '' } },
        { type: 'highlight', attrs: { color: '' } }
      )
    );

    expect(result.changed).toBe(1);
    expect(marksOf(result.content)).toEqual([
      { type: 'highlight', attrs: { color: '' } },
    ]);
  });

  it('leaves an attribute already at the extension’s default alone', () => {
    // `clearAttribute` tests `null`/`undefined`/`''`, not truthiness: anything
    // else would let a second run rewrite every note the first one touched.
    const marked = stripStoredPresentation(
      docWithMarks(
        { type: 'highlight', attrs: { color: null } },
        { type: 'link', attrs: { href: '/space/notes/a', class: null } }
      )
    );
    const cell = stripStoredPresentation(
      docWithCell({ colspan: 1, rowspan: 1, colwidth: null })
    );

    expect(marked.changed).toBe(0);
    expect(cell.changed).toBe(0);
  });

  it('clears a column width copied out of a source colgroup', () => {
    const result = stripStoredPresentation(
      docWithCell({ colspan: 1, rowspan: 1, colwidth: [217] })
    );

    expect(result.changed).toBe(1);
    expect(cellAttrs(result.content)).toEqual({
      colspan: 1,
      rowspan: 1,
      colwidth: null,
    });
  });

  it('counts every removal, not the document it found them in', () => {
    // The caller turns this into a per-note boolean (`changed === 0`), so the
    // number itself only has to be non-zero — but it is a tally of marks and
    // attributes, and reading it as "notes" would be wrong.
    const result = stripStoredPresentation(
      JSON.stringify({
        type: 'doc',
        content: [
          {
            type: 'table',
            content: [
              {
                type: 'tableRow',
                content: [
                  {
                    type: 'tableCell',
                    attrs: { colspan: 1, rowspan: 1, colwidth: [217] },
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            type: 'text',
                            text: 'EMEA',
                            marks: [
                              { type: 'textStyle', attrs: { color: '' } },
                              { type: 'highlight', attrs: { color: '#ff0' } },
                              {
                                type: 'link',
                                attrs: { href: '/a', class: 'external' },
                              },
                            ],
                          },
                          {
                            type: 'text',
                            text: ' 12,400',
                            marks: [
                              {
                                type: 'textStyle',
                                attrs: { color: '#073763' },
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      })
    );

    expect(result.changed).toBe(5);
  });

  it('returns the identical string when there was nothing to strip', () => {
    // `toBe`, not `toEqual`, on purpose: the caller skips the database write
    // on `changed === 0`, and a re-serialized copy would be an equal string
    // that still costs a write and an `@updatedAt` bump for nothing.
    const original = docWithMarks({ type: 'bold' });

    expect(stripStoredPresentation(original).content).toBe(original);
  });

  it('returns a document that does not parse untouched', () => {
    const result = stripStoredPresentation('not json at all');

    expect(result.changed).toBe(0);
    expect(result.content).toBe('not json at all');
  });
});
