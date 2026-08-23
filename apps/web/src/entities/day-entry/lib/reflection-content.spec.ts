import { describe, expect, it } from 'bun:test';

import {
  parseReflection,
  reflectionPlainText,
  serializeReflection,
} from './reflection-content';

describe('parseReflection', () => {
  it('returns null for null and for whitespace', () => {
    expect(parseReflection(null)).toBeNull();
    expect(parseReflection('   ')).toBeNull();
  });

  it('reads a stored Tiptap document back', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'hello' }] },
      ],
    };
    expect(parseReflection(JSON.stringify(doc))).toEqual(doc);
  });

  // The legacy path: every row written before this change is plain text.
  it('wraps legacy plain text in a one-paragraph document', () => {
    expect(parseReflection('a good day')).toEqual({
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'a good day' }] },
      ],
    });
  });

  it('keeps each line of legacy text as its own paragraph', () => {
    expect(parseReflection('one\ntwo')).toEqual({
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'one' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'two' }] },
      ],
    });
  });

  // Valid JSON that is not a document must NOT be mistaken for one. A reader
  // who typed `[1,2,3]` into the old textarea wrote text, not a doc.
  it('treats non-document JSON as plain text', () => {
    expect(parseReflection('[1,2,3]')).toEqual({
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: '[1,2,3]' }] },
      ],
    });
  });

  it('treats malformed JSON as plain text', () => {
    expect(parseReflection('{oops')).toEqual({
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: '{oops' }] },
      ],
    });
  });
});

describe('serializeReflection', () => {
  it('returns null for null', () => {
    expect(serializeReflection(null)).toBeNull();
  });

  // An empty editor produces a doc with one empty paragraph. Storing that
  // would make the calendar draw a "written up" dot for a day nobody wrote.
  it('returns null for a document with no text', () => {
    expect(
      serializeReflection({ type: 'doc', content: [{ type: 'paragraph' }] })
    ).toBeNull();
  });

  it('round-trips a document', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'hi' }] },
      ],
    };
    expect(parseReflection(serializeReflection(doc))).toEqual(doc);
  });

  // A pasted image has no `text` node anywhere in it. Before the emptiness
  // rule was widened this collapsed to `null` and the image was silently
  // dropped on save.
  it('does NOT collapse a document holding only an image node', () => {
    const doc = {
      type: 'doc',
      content: [{ type: 'image', attrs: { src: 'https://example.com/a.png' } }],
    };
    expect(serializeReflection(doc)).not.toBeNull();
  });

  // Two empty paragraphs are still nothing written — a table of empty cells
  // is the case that must NOT collapse, but a document that is only
  // paragraphs (with or without a second one) has no non-paragraph node and
  // no text, so it stays null.
  it('still returns null for a document of two empty paragraphs', () => {
    expect(
      serializeReflection({
        type: 'doc',
        content: [{ type: 'paragraph' }, { type: 'paragraph' }],
      })
    ).toBeNull();
  });
});

describe('reflectionPlainText', () => {
  it('is empty for null', () => {
    expect(reflectionPlainText(null)).toBe('');
  });

  it('joins block text with newlines', () => {
    expect(
      reflectionPlainText({
        type: 'doc',
        content: [
          { type: 'paragraph', content: [{ type: 'text', text: 'one' }] },
          { type: 'paragraph', content: [{ type: 'text', text: 'two' }] },
        ],
      })
    ).toBe('one\ntwo');
  });

  // The length cap is about how much a person WROTE, not how much JSON that
  // became — see Step 3.
  it('ignores the JSON envelope', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'x', marks: [{ type: 'bold' }] }],
        },
      ],
    };
    expect(reflectionPlainText(doc)).toBe('x');
    expect(JSON.stringify(doc).length).toBeGreaterThan(50);
  });
});
