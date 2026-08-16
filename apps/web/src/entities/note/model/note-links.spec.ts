/**
 * Link extraction is what turns a document into rows in `note_links`, so what
 * it does and does not pick up is a real contract: a missed link is a note
 * that silently drops out of the knowledge graph, and an over-eager match
 * writes a row for something that is not a note at all.
 */
import { describe, expect, it } from 'bun:test';

import {
  extractNoteLinkIds,
  noteHref,
  parseNoteHref,
  relabelNoteLinks,
} from './note-links';

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

/**
 * An anchor's text is a snapshot of the target's title at insert time, so a
 * rename leaves every inbound link reading the old name. What this rewrites
 * — and, far more importantly, what it refuses to rewrite — is the contract:
 * it runs across OTHER people's documents during a rename of one note, and a
 * false positive silently edits prose the author wrote by hand, with no undo.
 */
describe('relabelNoteLinks', () => {
  const OPTIONS = { noteId: 'note-1', from: 'Kafka', to: 'Kafka internals' };

  /** A paragraph of `[text, href]` pairs; a null href means unlinked text. */
  function doc(...runs: [string, string | null][]): string {
    return JSON.stringify({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: runs.map(([text, href]) => ({
            type: 'text',
            text,
            ...(href === null
              ? {}
              : { marks: [{ type: 'link', attrs: { href } }] }),
          })),
        },
      ],
    });
  }

  /** Every text node's text, in document order. */
  function texts(content: string): string[] {
    const parsed: unknown = JSON.parse(content);
    const out: string[] = [];
    const walk = (node: unknown): void => {
      if (typeof node !== 'object' || node === null) return;
      const record = node as { type?: unknown; text?: unknown; content?: unknown };
      if (record.type === 'text' && typeof record.text === 'string') {
        out.push(record.text);
      }
      if (Array.isArray(record.content)) record.content.forEach(walk);
    };
    walk(parsed);
    return out;
  }

  it('rewrites a link whose text is exactly the old title', () => {
    const result = relabelNoteLinks(doc(['Kafka', '/space/notes/note-1']), OPTIONS);

    expect(result.changed).toBe(1);
    expect(texts(result.content)).toEqual(['Kafka internals']);
  });

  it('leaves a hand-written label alone', () => {
    // The whole reason the match is exact. "xem bài trước" is a sentence the
    // author wrote; replacing it with a note title would corrupt prose during
    // a rename of a completely different note.
    const original = doc(['xem bài trước', '/space/notes/note-1']);
    const result = relabelNoteLinks(original, OPTIONS);

    expect(result.changed).toBe(0);
    expect(result.content).toBe(original);
  });

  it('leaves a differently-cased copy of the old title alone', () => {
    // Case difference is evidence somebody typed the label rather than
    // inserting it, so it is not ours to change.
    const result = relabelNoteLinks(doc(['kafka', '/space/notes/note-1']), OPTIONS);

    expect(result.changed).toBe(0);
  });

  it('leaves matching text that links to a different note alone', () => {
    // Two notes can legitimately share a title, and the id is what decides.
    const result = relabelNoteLinks(doc(['Kafka', '/space/notes/note-9']), OPTIONS);

    expect(result.changed).toBe(0);
    expect(texts(result.content)).toEqual(['Kafka']);
  });

  it('leaves matching text carrying no link at all alone', () => {
    const result = relabelNoteLinks(doc(['Kafka', null]), OPTIONS);

    expect(result.changed).toBe(0);
  });

  it('matches the locale-prefixed href the address bar produces', () => {
    // A link the author pasted from their own tab arrives as `/vi/...`, and
    // would otherwise be the one form a rename silently left stale.
    const result = relabelNoteLinks(
      doc(['Kafka', '/vi/space/notes/note-1']),
      OPTIONS
    );

    expect(result.changed).toBe(1);
    expect(texts(result.content)).toEqual(['Kafka internals']);
  });

  it('rewrites links nested deep inside the document', () => {
    const nested = JSON.stringify({
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
                      text: 'Kafka',
                      marks: [
                        { type: 'bold' },
                        { type: 'link', attrs: { href: '/space/notes/note-1' } },
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

    const result = relabelNoteLinks(nested, OPTIONS);

    expect(result.changed).toBe(1);
    expect(texts(result.content)).toEqual(['Kafka internals']);
    // The marks a rewritten node carried must survive: dropping the bold, or
    // worse the link itself, would turn a relabel into a delete.
    const parsed = JSON.parse(result.content) as {
      content: [{ content: [{ content: [{ content: [{ marks: unknown[] }] }] }] }];
    };
    expect(parsed.content[0].content[0].content[0].content[0].marks).toEqual([
      { type: 'bold' },
      { type: 'link', attrs: { href: '/space/notes/note-1' } },
    ]);
  });

  it('counts every rewritten node and leaves the rest of the paragraph intact', () => {
    const result = relabelNoteLinks(
      doc(
        ['Kafka', '/space/notes/note-1'],
        [' and again ', null],
        ['Kafka', '/vi/space/notes/note-1'],
        ['Kafka', '/space/notes/note-2'],
        ['see also', '/space/notes/note-1']
      ),
      OPTIONS
    );

    expect(result.changed).toBe(2);
    expect(texts(result.content)).toEqual([
      'Kafka internals',
      ' and again ',
      'Kafka internals',
      'Kafka',
      'see also',
    ]);
  });

  it('returns the document untouched when it does not parse', () => {
    // This runs over OTHER notes during a rename. One broken document must
    // not fail the rename, and must certainly not be replaced by anything.
    const result = relabelNoteLinks('not json', OPTIONS);

    expect(result.changed).toBe(0);
    expect(result.content).toBe('not json');
  });

  it('returns the identical string when nothing changed', () => {
    // `toBe`, not `toEqual`, on purpose: callers skip the database write on
    // `changed === 0`, and a re-serialized copy would be an equal string that
    // still costs a write and shows up as a spurious diff.
    const original = doc(['unrelated prose', null]);

    expect(relabelNoteLinks(original, OPTIONS).content).toBe(original);
  });

  it('does not edit the document it was given in place', () => {
    // The signature takes a string today, so this is a regression guard for
    // the day it takes a parsed document: the input must still read the old
    // title after a rewrite.
    const original = doc(['Kafka', '/space/notes/note-1']);
    const result = relabelNoteLinks(original, OPTIONS);

    expect(texts(original)).toEqual(['Kafka']);
    expect(texts(result.content)).toEqual(['Kafka internals']);
  });

  it('rewrites a document deeper than the default rich-text nesting without recursing', () => {
    // Same argument as `extractNoteLinkIds`: author-controlled data that has
    // round-tripped through the database must not take a server action down.
    // A copy is the harder case — a recursive one would rebuild the whole
    // tree on the stack, not merely read it.
    let node: Record<string, unknown> = {
      type: 'text',
      text: 'Kafka',
      marks: [{ type: 'link', attrs: { href: '/space/notes/note-1' } }],
    };
    for (let i = 0; i < 500; i += 1) {
      node = { type: 'paragraph', content: [node] };
    }

    const result = relabelNoteLinks(
      JSON.stringify({ type: 'doc', content: [node] }),
      OPTIONS
    );

    expect(result.changed).toBe(1);
    expect(texts(result.content)).toEqual(['Kafka internals']);
  });
});
