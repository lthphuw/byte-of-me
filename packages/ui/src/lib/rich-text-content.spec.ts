import { describe, expect, it } from 'bun:test';

import {
  fromEditorContent,
  isRichTextBlank,
  parseRichTextContent,
  richTextToPlainText,
  toEditorContent,
} from './rich-text-content';

const doc = { type: 'doc', content: [{ type: 'paragraph' }] };

describe('parseRichTextContent', () => {
  it('returns null for empty values', () => {
    expect(parseRichTextContent('')).toBeNull();
    expect(parseRichTextContent(null)).toBeNull();
    expect(parseRichTextContent(undefined)).toBeNull();
  });

  it('parses a stringified document', () => {
    expect(parseRichTextContent(JSON.stringify(doc))).toEqual(doc);
  });

  it('passes an already-parsed document through', () => {
    expect(parseRichTextContent(doc)).toEqual(doc);
  });

  it('returns null for text that is not a document', () => {
    expect(parseRichTextContent('just some prose')).toBeNull();
    // Valid JSON, but a scalar rather than a node.
    expect(parseRichTextContent('42')).toBeNull();
    expect(parseRichTextContent('"quoted"')).toBeNull();
  });

  it('never throws on malformed JSON', () => {
    expect(() => parseRichTextContent('{"type":')).not.toThrow();
    expect(parseRichTextContent('{"type":')).toBeNull();
  });
});

describe('toEditorContent', () => {
  it('returns an empty string for empty values', () => {
    expect(toEditorContent('')).toBe('');
    expect(toEditorContent(null)).toBe('');
    expect(toEditorContent(undefined)).toBe('');
  });

  it('hands a stored document back as an object', () => {
    expect(toEditorContent(JSON.stringify(doc))).toEqual(doc);
  });

  it('hands legacy plain text back verbatim so it is not lost', () => {
    // Rows written before the editor existed hold prose, not JSON. Tiptap
    // turns this into a paragraph rather than dropping it.
    expect(toEditorContent('an older plain-text achievement')).toBe(
      'an older plain-text achievement'
    );
  });
});

describe('fromEditorContent', () => {
  it('round-trips through toEditorContent', () => {
    expect(toEditorContent(fromEditorContent(doc))).toEqual(doc);
  });
});

describe('richTextToPlainText', () => {
  it('returns an empty string for empty values', () => {
    expect(richTextToPlainText('')).toBe('');
    expect(richTextToPlainText(null)).toBe('');
    expect(richTextToPlainText(undefined)).toBe('');
  });

  it('hands legacy plain text back verbatim', () => {
    expect(richTextToPlainText('an older plain-text description')).toBe(
      'an older plain-text description'
    );
  });

  it('joins block text with spaces and drops markup structure', () => {
    const richDoc = JSON.stringify({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'A CMS ' },
            { type: 'text', marks: [{ type: 'bold' }], text: 'and' },
            { type: 'text', text: ' portfolio.' },
          ],
        },
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Multilingual' }],
                },
              ],
            },
          ],
        },
      ],
    });

    expect(richTextToPlainText(richDoc)).toBe(
      'A CMS and portfolio. Multilingual'
    );
  });

  it('separates SIBLING blocks, so the words either side stay whole', () => {
    // The regression this closes: every level joined with '', so the last
    // word of one list item welded onto the first word of the next. In the
    // notes corpus that produced tokens like `data.Step` and
    // `motionpackages` — Postgres indexed the weld and neither real word
    // could be found again. One item cannot show it; two can.
    const richDoc = JSON.stringify({
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
                  content: [{ type: 'text', text: 'passes through the data.' }],
                },
              ],
            },
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [
                    { type: 'text', text: 'Step Size defines epochs.' },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });

    expect(richTextToPlainText(richDoc)).toBe(
      'passes through the data. Step Size defines epochs.'
    );
  });

  it('keeps an inline run welded, so a mark does not split a word', () => {
    // The other side of the same rule: marks cut a sentence into several
    // text nodes, and separating THOSE would put a space inside a word.
    const richDoc = JSON.stringify({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Conv' },
            { type: 'text', marks: [{ type: 'bold' }], text: 'NeXt' },
            { type: 'text', text: ' V2' },
          ],
        },
      ],
    });

    expect(richTextToPlainText(richDoc)).toBe('ConvNeXt V2');
  });

  it('skips blocks with no text, such as empty paragraphs', () => {
    const richDoc = JSON.stringify({
      type: 'doc',
      content: [
        { type: 'paragraph' },
        { type: 'paragraph', content: [{ type: 'text', text: 'Only me' }] },
      ],
    });

    expect(richTextToPlainText(richDoc)).toBe('Only me');
  });
});

describe('isRichTextBlank', () => {
  it('treats absent, empty and whitespace-only values as blank', () => {
    expect(isRichTextBlank(null)).toBe(true);
    expect(isRichTextBlank(undefined)).toBe(true);
    expect(isRichTextBlank('')).toBe(true);
    expect(isRichTextBlank('   \n\t ')).toBe(true);
  });

  it('treats a document of empty paragraphs as blank', () => {
    expect(isRichTextBlank(JSON.stringify(doc))).toBe(true);
    expect(
      isRichTextBlank(
        JSON.stringify({
          type: 'doc',
          content: [{ type: 'paragraph' }, { type: 'paragraph', content: [] }],
        })
      )
    ).toBe(true);
  });

  it('treats a document whose text is only whitespace as blank', () => {
    const spaces = JSON.stringify({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: '  ' }] }],
    });
    expect(isRichTextBlank(spaces)).toBe(true);
  });

  it('does not treat a document with text as blank', () => {
    const text = JSON.stringify({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hi' }] }],
    });
    expect(isRichTextBlank(text)).toBe(false);
  });

  it('does not treat a table with empty cells as blank', () => {
    // The author built the table on purpose, and the form shows it.
    const table = JSON.stringify({
      type: 'doc',
      content: [
        {
          type: 'table',
          content: [
            {
              type: 'tableRow',
              content: [
                { type: 'tableCell', content: [{ type: 'paragraph' }] },
              ],
            },
          ],
        },
      ],
    });
    expect(isRichTextBlank(table)).toBe(false);
  });

  it('does not treat legacy plain text with content as blank', () => {
    expect(isRichTextBlank('an older plain-text description')).toBe(false);
  });

  const docOf = (...content: unknown[]) =>
    JSON.stringify({ type: 'doc', content });
  const para = (text: string) => ({
    type: 'paragraph',
    content: [{ type: 'text', text }],
  });
  const emptyPara = { type: 'paragraph' };

  it.each([
    ['an empty heading', { type: 'heading', attrs: { level: 2 } }],
    [
      'a heading holding only whitespace',
      {
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: ' ' }],
      },
    ],
    [
      'an empty bullet list',
      {
        type: 'bulletList',
        content: [{ type: 'listItem', content: [emptyPara] }],
      },
    ],
    [
      'an empty ordered list',
      {
        type: 'orderedList',
        content: [{ type: 'listItem', content: [emptyPara] }],
      },
    ],
    [
      'an empty list item',
      { type: 'bulletList', content: [{ type: 'listItem' }] },
    ],
    ['an empty blockquote', { type: 'blockquote', content: [emptyPara] }],
    [
      'a blockquote around an empty list',
      {
        type: 'blockquote',
        content: [
          {
            type: 'bulletList',
            content: [{ type: 'listItem', content: [emptyPara] }],
          },
        ],
      },
    ],
    [
      'a paragraph holding only a hard break',
      { type: 'paragraph', content: [{ type: 'hardBreak' }] },
    ],
  ])('treats %s as blank', (_label, block) => {
    expect(isRichTextBlank(docOf(block))).toBe(true);
  });

  it.each([
    [
      'a heading with text',
      {
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: 'Results' }],
      },
    ],
    [
      'a list item with text',
      {
        type: 'bulletList',
        content: [{ type: 'listItem', content: [para('Step one')] }],
      },
    ],
    ['a quote with text', { type: 'blockquote', content: [para('Quoted')] }],
    [
      'a paragraph with a hard break before text',
      {
        type: 'paragraph',
        content: [{ type: 'hardBreak' }, { type: 'text', text: 'after' }],
      },
    ],
  ])('does not treat %s as blank', (_label, block) => {
    expect(isRichTextBlank(docOf(block))).toBe(false);
  });

  it('does not treat an image-only document as blank', () => {
    // Decision: an image is a deliberate element even with no caption or text.
    expect(
      isRichTextBlank(docOf({ type: 'image', attrs: { src: '/a.png' } }))
    ).toBe(false);
  });

  it('does not treat a code-block-only document as blank', () => {
    // Decision: a code block is content on its own, the same as a table with
    // empty cells, so a block of code is never hidden behind a toggle.
    expect(
      isRichTextBlank(
        docOf({ type: 'codeBlock', content: [{ type: 'text', text: 'npm i' }] })
      )
    ).toBe(false);
    expect(isRichTextBlank(docOf({ type: 'codeBlock' }))).toBe(false);
  });

  it('does not treat a document holding only a horizontal rule as blank', () => {
    // Decision, unchanged: a rule is a deliberate element, not an empty block.
    expect(isRichTextBlank(docOf({ type: 'horizontalRule' }))).toBe(false);
  });

  it('never throws on parsed JSON that is not shaped like a document', () => {
    const shapes = [
      '{"type":"doc","content":"abc"}',
      '{"type":"doc","content":[null, 3, "x"]}',
      '{"type":"doc","content":[{"type":"text","text":7}]}',
      '[1,2,3]',
      'null',
      '{"type":',
    ];
    for (const shape of shapes) {
      expect(() => isRichTextBlank(shape)).not.toThrow();
    }
    expect(isRichTextBlank('{"type":"doc","content":"abc"}')).toBe(true);
  });
});
