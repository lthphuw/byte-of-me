/**
 * Link extraction is what turns a document into rows in `note_links`, so what
 * it does and does not pick up is a real contract: a missed link is a note
 * that silently drops out of the knowledge graph, and an over-eager match
 * writes a row for something that is not a note at all.
 */
import { describe, expect, it } from 'bun:test';

import { extractNoteLinkIds, noteHref, parseNoteHref } from './note-links';

function docWithHrefs(...hrefs: string[]): string {
  return JSON.stringify({
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: hrefs.map((href, index) => ({
          type: 'text',
          text: `link ${index}`,
          marks: [{ type: 'link', attrs: { href } }],
        })),
      },
    ],
  });
}

describe('parseNoteHref', () => {
  it('reads the id out of a note path', () => {
    expect(parseNoteHref('/space/notes/abc123')).toBe('abc123');
  });

  it('accepts the locale-prefixed form the address bar produces', () => {
    expect(parseNoteHref('/vi/space/notes/abc123')).toBe('abc123');
    expect(parseNoteHref('/en/space/notes/abc123')).toBe('abc123');
  });

  it('rejects anything that is not a note path', () => {
    expect(parseNoteHref('https://example.com')).toBeNull();
    expect(parseNoteHref('mailto:someone@example.com')).toBeNull();
    expect(parseNoteHref('/space/schedule/abc123')).toBeNull();
    expect(parseNoteHref('/dashboard/blogs/abc123')).toBeNull();
  });

  it('rejects a path with further segments below the note', () => {
    expect(parseNoteHref('/space/notes/abc123/edit')).toBeNull();
  });

  it('round-trips with noteHref', () => {
    expect(parseNoteHref(noteHref('abc123'))).toBe('abc123');
  });
});

describe('extractNoteLinkIds', () => {
  it('returns one id per linked note, in first-appearance order', () => {
    expect(
      extractNoteLinkIds(docWithHrefs('/space/notes/b', '/space/notes/a'))
    ).toEqual(['b', 'a']);
  });

  it('deduplicates a note linked more than once', () => {
    expect(
      extractNoteLinkIds(
        docWithHrefs('/space/notes/a', '/space/notes/b', '/space/notes/a')
      )
    ).toEqual(['a', 'b']);
  });

  it('ignores external links', () => {
    expect(
      extractNoteLinkIds(
        docWithHrefs('https://example.com', '/space/notes/a', 'mailto:a@b.c')
      )
    ).toEqual(['a']);
  });

  it('finds links nested deep inside the document', () => {
    const doc = JSON.stringify({
      type: 'doc',
      content: [
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [
                    {
                      type: 'text',
                      text: 'nested',
                      marks: [
                        { type: 'bold' },
                        { type: 'link', attrs: { href: '/space/notes/deep' } },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });

    expect(extractNoteLinkIds(doc)).toEqual(['deep']);
  });

  it('returns nothing for a document that does not parse', () => {
    // Callers treat this as "no links" rather than an error — the save that
    // produced it is what would be wrong, and that is validated separately.
    expect(extractNoteLinkIds('not json')).toEqual([]);
  });

  it('returns nothing, rather than throwing, for a document too deep to parse', () => {
    // Author-controlled data that has already round-tripped through the
    // database must not be able to take a server action down with it. At this
    // depth `JSON.parse` itself raises a RangeError — the walk never gets a
    // chance to run — and the caller must still get an answer.
    const tooDeep = `${'['.repeat(200_000)}${']'.repeat(200_000)}`;

    expect(extractNoteLinkIds(tooDeep)).toEqual([]);
  });

  it('walks a document deeper than the default rich-text nesting without recursing', () => {
    let node: Record<string, unknown> = {
      type: 'text',
      text: 'bottom',
      marks: [{ type: 'link', attrs: { href: '/space/notes/bottom' } }],
    };
    // Deep enough to be well past anything an author produces by hand, and
    // shallow enough that `JSON.stringify`/`JSON.parse` still cope — so what
    // this measures is the walk, not the JSON round trip.
    for (let i = 0; i < 500; i += 1) {
      node = { type: 'paragraph', content: [node] };
    }

    expect(
      extractNoteLinkIds(JSON.stringify({ type: 'doc', content: [node] }))
    ).toEqual(['bottom']);
  });
});
