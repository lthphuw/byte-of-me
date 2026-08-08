/**
 * The shared surface serves note links pointing at `/shared/notes/<id>` and
 * accepts them back on an editor save. The contract that matters most is that
 * the pair is LOSSLESS: `updateSharedNote` rebuilds a note's outgoing links
 * from its document, so an href the inverse fails to restore is not a broken
 * link — it is the silent deletion of the owner's link rows.
 */
import { describe, expect, it } from 'bun:test';

import {
  parseSharedNoteHref,
  rewriteNoteLinks,
  SHARED_NOTE_HREF_PREFIX,
} from './rewrite-note-links';

function docWithHrefs(...hrefs: string[]): string {
  return JSON.stringify({
    type: 'doc',
    content: hrefs.map((href) => ({
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: 'link',
          marks: [{ type: 'link', attrs: { href } }],
        },
      ],
    })),
  });
}

function hrefsIn(content: string): string[] {
  const found: string[] = [];

  const walk = (node: unknown): void => {
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (typeof node !== 'object' || node === null) {
      return;
    }

    const record = node as Record<string, unknown>;

    if (record.type === 'link') {
      const attrs = record.attrs as Record<string, unknown> | undefined;
      if (typeof attrs?.href === 'string') {
        found.push(attrs.href);
      }
    }

    Object.values(record).forEach(walk);
  };

  walk(JSON.parse(content));

  return found;
}

describe('rewriteNoteLinks', () => {
  it('maps an owner note href onto the shared surface', () => {
    const out = rewriteNoteLinks(docWithHrefs('/space/notes/abc'), 'toShared');

    expect(hrefsIn(out)).toEqual([`${SHARED_NOTE_HREF_PREFIX}abc`]);
  });

  it('maps a locale-prefixed owner href too', () => {
    // A link the author pasted from their own address bar arrives as
    // `/vi/space/notes/<id>`; dropping those would lose real links.
    const out = rewriteNoteLinks(
      docWithHrefs('/vi/space/notes/abc'),
      'toShared'
    );

    expect(hrefsIn(out)).toEqual([`${SHARED_NOTE_HREF_PREFIX}abc`]);
  });

  it('leaves non-note hrefs alone in both directions', () => {
    const doc = docWithHrefs('https://example.com', 'mailto:a@b.c');

    expect(hrefsIn(rewriteNoteLinks(doc, 'toShared'))).toEqual([
      'https://example.com',
      'mailto:a@b.c',
    ]);
    expect(hrefsIn(rewriteNoteLinks(doc, 'toOwner'))).toEqual([
      'https://example.com',
      'mailto:a@b.c',
    ]);
  });

  it('round-trips losslessly', () => {
    // THE test. `updateSharedNote` rebuilds link rows from the document, so an
    // href the inverse cannot restore silently deletes the owner's links.
    const doc = docWithHrefs('/space/notes/a', '/space/notes/b');

    const back = rewriteNoteLinks(rewriteNoteLinks(doc, 'toShared'), 'toOwner');

    expect(hrefsIn(back)).toEqual(['/space/notes/a', '/space/notes/b']);
  });

  it('rewrites a link nested deep inside the document', () => {
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
                      text: 'deep',
                      marks: [
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

    expect(hrefsIn(rewriteNoteLinks(doc, 'toShared'))).toEqual([
      `${SHARED_NOTE_HREF_PREFIX}deep`,
    ]);
  });

  it('returns the input unchanged when it is not parseable JSON', () => {
    expect(rewriteNoteLinks('not json', 'toShared')).toBe('not json');
  });
});

describe('parseSharedNoteHref', () => {
  it('reads the id out of a shared href', () => {
    expect(parseSharedNoteHref('/shared/notes/abc123')).toBe('abc123');
    expect(parseSharedNoteHref('/vi/shared/notes/abc123')).toBe('abc123');
  });

  it('rejects anything else', () => {
    expect(parseSharedNoteHref('/space/notes/abc')).toBeNull();
    expect(parseSharedNoteHref('/shared/notes/abc/edit')).toBeNull();
    expect(parseSharedNoteHref('https://example.com')).toBeNull();
  });
});
