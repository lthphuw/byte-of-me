import {
  fromEditorContent,
  parseRichTextContent,
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
