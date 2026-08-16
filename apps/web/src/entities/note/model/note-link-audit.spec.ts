/**
 * `collectNoteLinkLabels` is what the stale-link report is built from, so what
 * counts as one anchor is a real contract: split a run and the author is shown
 * three findings for one sentence, none of them the text they can see; merge
 * two genuinely separate anchors and one of them silently stops being
 * reportable.
 */
import { describe, expect, it } from 'bun:test';

import { collectNoteLinkLabels } from './note-link-audit';

/** A paragraph of text nodes, each optionally carrying a link href. */
function paragraph(
  ...runs: Array<{ text: string; href?: string }>
): Record<string, unknown> {
  return {
    type: 'paragraph',
    content: runs.map((run) => ({
      type: 'text',
      text: run.text,
      ...(run.href
        ? { marks: [{ type: 'link', attrs: { href: run.href } }] }
        : {}),
    })),
  };
}

function doc(...nodes: Record<string, unknown>[]): string {
  return JSON.stringify({ type: 'doc', content: nodes });
}

describe('collectNoteLinkLabels', () => {
  it('reports the target id and the visible text of each note link', () => {
    expect(
      collectNoteLinkLabels(
        doc(paragraph({ text: 'Kafka rebalancing', href: '/space/notes/a' }))
      )
    ).toEqual([{ noteId: 'a', text: 'Kafka rebalancing' }]);
  });

  it('reads the locale-prefixed href the address bar produces', () => {
    expect(
      collectNoteLinkLabels(
        doc(paragraph({ text: 'see this', href: '/vi/space/notes/a' }))
      )
    ).toEqual([{ noteId: 'a', text: 'see this' }]);
  });

  it('ignores links that are not notes', () => {
    expect(
      collectNoteLinkLabels(
        doc(
          paragraph(
            { text: 'kafka docs', href: 'https://kafka.apache.org' },
            { text: 'mail me', href: 'mailto:a@b.c' },
            { text: 'a note', href: '/space/notes/a' }
          )
        )
      )
    ).toEqual([{ noteId: 'a', text: 'a note' }]);
  });

  it('ignores text carrying no link at all', () => {
    expect(
      collectNoteLinkLabels(doc(paragraph({ text: 'just prose' })))
    ).toEqual([]);
  });

  it('merges the text nodes a mark change splits one anchor into', () => {
    // "as discussed earlier" with `discussed` in bold is three text nodes
    // sharing one href. Reported per node the author would be shown three
    // stale labels for one anchor, none of them the words on screen.
    expect(
      collectNoteLinkLabels(
        doc(
          paragraph(
            { text: 'as ', href: '/space/notes/a' },
            { text: 'discussed', href: '/space/notes/a' },
            { text: ' earlier', href: '/space/notes/a' }
          )
        )
      )
    ).toEqual([{ noteId: 'a', text: 'as discussed earlier' }]);
  });

  it('keeps two anchors to the same note separate when prose divides them', () => {
    expect(
      collectNoteLinkLabels(
        doc(
          paragraph(
            { text: 'the rebalance note', href: '/space/notes/a' },
            { text: ' and again ' },
            { text: 'that note', href: '/space/notes/a' }
          )
        )
      )
    ).toEqual([
      { noteId: 'a', text: 'the rebalance note' },
      { noteId: 'a', text: 'that note' },
    ]);
  });

  it('ends a run at a link to a different note', () => {
    expect(
      collectNoteLinkLabels(
        doc(
          paragraph(
            { text: 'first', href: '/space/notes/a' },
            { text: 'second', href: '/space/notes/b' }
          )
        )
      )
    ).toEqual([
      { noteId: 'a', text: 'first' },
      { noteId: 'b', text: 'second' },
    ]);
  });

  it('returns anchors in document order across blocks', () => {
    expect(
      collectNoteLinkLabels(
        doc(
          paragraph({ text: 'one', href: '/space/notes/a' }),
          paragraph({ text: 'two', href: '/space/notes/b' }),
          paragraph({ text: 'three', href: '/space/notes/c' })
        )
      ).map((anchor) => anchor.noteId)
    ).toEqual(['a', 'b', 'c']);
  });

  it('finds anchors nested deep inside the document', () => {
    const nested = {
      type: 'bulletList',
      content: [
        {
          type: 'listItem',
          content: [paragraph({ text: 'nested label', href: '/space/notes/d' })],
        },
      ],
    };

    expect(collectNoteLinkLabels(doc(nested))).toEqual([
      { noteId: 'd', text: 'nested label' },
    ]);
  });

  it('reports an anchor with no visible text rather than dropping it', () => {
    // Whether an invisible anchor is worth showing is the report's policy;
    // the parser's job is to describe the document as it is.
    expect(
      collectNoteLinkLabels(
        JSON.stringify({
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  marks: [
                    { type: 'link', attrs: { href: '/space/notes/a' } },
                  ],
                },
              ],
            },
          ],
        })
      )
    ).toEqual([{ noteId: 'a', text: '' }]);
  });

  it('returns nothing for a document that does not parse', () => {
    expect(collectNoteLinkLabels('not json')).toEqual([]);
  });

  it('returns nothing, rather than throwing, for a document too deep to parse', () => {
    // Author-controlled data that has already round-tripped through the
    // database must not be able to take a server action down with it. At this
    // depth `JSON.parse` itself raises a RangeError.
    const tooDeep = `${'['.repeat(200_000)}${']'.repeat(200_000)}`;

    expect(collectNoteLinkLabels(tooDeep)).toEqual([]);
  });

  it('walks a document far deeper than a recursive pass would survive', () => {
    let node: Record<string, unknown> = paragraph({
      text: 'bottom',
      href: '/space/notes/bottom',
    });
    for (let i = 0; i < 500; i += 1) {
      node = { type: 'blockquote', content: [node] };
    }

    expect(collectNoteLinkLabels(doc(node))).toEqual([
      { noteId: 'bottom', text: 'bottom' },
    ]);
  });

  it('survives a document whose nodes are not the shapes Tiptap emits', () => {
    // Nulls, strings and numbers where nodes are expected, marks that are not
    // arrays, attrs that are not objects: all of it has to come back as "no
    // anchors" rather than a TypeError inside a server action.
    expect(
      collectNoteLinkLabels(
        JSON.stringify({
          type: 'doc',
          content: [
            null,
            'text',
            42,
            { type: 'paragraph', content: 'not an array' },
            { type: 'paragraph', content: [{ type: 'text', marks: 'nope' }] },
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'x', marks: [{ type: 'link' }] }],
            },
            {
              type: 'paragraph',
              content: [
                { type: 'text', text: 'y', marks: [{ type: 'link', attrs: 7 }] },
              ],
            },
          ],
        })
      )
    ).toEqual([]);
  });
});
