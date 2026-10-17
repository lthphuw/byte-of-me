import { describe, expect, test } from 'bun:test';

import { richTextDocSchema } from './rich-text-doc-schema';

describe('richTextDocSchema', () => {
  test('accepts a TipTap document holding a block', () => {
    const result = richTextDocSchema.safeParse({
      type: 'doc',
      content: [{ type: 'paragraph' }],
    });

    expect(result.success).toBe(true);
  });

  test('rejects a plain string', () => {
    expect(richTextDocSchema.safeParse('plain text').success).toBe(false);
  });

  test('rejects an inline text node at the top level', () => {
    expect(
      richTextDocSchema.safeParse({ type: 'text', text: 'hello' }).success
    ).toBe(false);
  });
});
