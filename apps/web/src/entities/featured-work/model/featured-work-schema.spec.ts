import { describe, expect, it } from 'bun:test';

import {
  FEATURED_WORK_DETAILS_MAX_LENGTH,
  featuredWorkSchema,
} from './featured-work-schema';

const EMPTY_DOC = JSON.stringify({
  type: 'doc',
  content: [{ type: 'paragraph' }],
});
const TEXT_DOC = JSON.stringify({
  type: 'doc',
  content: [
    { type: 'paragraph', content: [{ type: 'text', text: 'Shipped it.' }] },
  ],
});

const base = {
  isPublished: true,
  translations: [{ language: 'en', title: 'INT8 quantization' }],
};

describe('featuredWorkSchema', () => {
  it('accepts an http(s) url, an empty url and no url', () => {
    for (const url of [
      'https://github.com/a/b/pull/1',
      'http://example.com',
      '',
      null,
      undefined,
    ]) {
      expect(featuredWorkSchema.safeParse({ ...base, url }).success).toBe(true);
    }
  });

  it('rejects non-http(s) urls', () => {
    for (const url of [
      'javascript:alert(1)',
      'ftp://x.y/z',
      'github.com/a/b',
    ]) {
      expect(featuredWorkSchema.safeParse({ ...base, url }).success).toBe(
        false
      );
    }
  });

  it('requires a title in every translation', () => {
    expect(
      featuredWorkSchema.safeParse({
        ...base,
        translations: [{ language: 'en', title: '' }],
      }).success
    ).toBe(false);
  });

  it('rejects two translations in the same language with a clean message', () => {
    const result = featuredWorkSchema.safeParse({
      ...base,
      translations: [
        { language: 'en', title: 'A' },
        { language: 'en', title: 'B' },
      ],
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(
      'Each language may appear once'
    );
  });

  it('accepts one translation per language', () => {
    expect(
      featuredWorkSchema.safeParse({
        ...base,
        translations: [
          { language: 'en', title: 'A' },
          { language: 'vi', title: 'B' },
        ],
      }).success
    ).toBe(true);
  });

  it('requires an English translation, reported on the English title', () => {
    const result = featuredWorkSchema.safeParse({
      ...base,
      translations: [{ language: 'vi', title: 'Chỉ tiếng Việt' }],
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('English title is required');
    expect(result.error?.issues[0]?.path).toEqual(['translations', 0, 'title']);
  });

  it('accepts an English-only translation', () => {
    expect(featuredWorkSchema.safeParse(base).success).toBe(true);
  });

  describe('details', () => {
    const withDetails = (details: unknown) =>
      featuredWorkSchema.safeParse({
        ...base,
        translations: [{ language: 'en', title: 'INT8 quantization', details }],
      });

    it('is optional in every language, English included', () => {
      expect(withDetails(undefined).success).toBe(true);
      expect(
        featuredWorkSchema.safeParse({
          ...base,
          translations: [
            { language: 'en', title: 'INT8 quantization' },
            { language: 'vi', title: 'Lượng tử hóa INT8' },
          ],
        }).success
      ).toBe(true);
    });

    it('keeps a body with text as the stored string', () => {
      const result = withDetails(TEXT_DOC);
      expect(result.success).toBe(true);
      expect(result.data?.translations[0]?.details).toBe(TEXT_DOC);
    });

    it('stores an empty document as null', () => {
      const result = withDetails(EMPTY_DOC);
      expect(result.success).toBe(true);
      expect(result.data?.translations[0]?.details).toBeNull();
    });

    it('stores an empty string as null', () => {
      expect(withDetails('').data?.translations[0]?.details).toBeNull();
    });

    it('accepts a body of exactly the maximum length', () => {
      const body = 'x'.repeat(FEATURED_WORK_DETAILS_MAX_LENGTH);
      expect(withDetails(body).success).toBe(true);
    });

    it('rejects a body one character over the maximum, reported on that translation', () => {
      const result = withDetails(
        'x'.repeat(FEATURED_WORK_DETAILS_MAX_LENGTH + 1)
      );
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.path).toEqual([
        'translations',
        0,
        'details',
      ]);
      expect(result.error?.issues[0]?.message).toBe('Details are too long');
    });
  });
});

describe('featuredWorkSchema media', () => {
  const parse = (media: unknown) =>
    featuredWorkSchema.safeParse({ ...base, media });

  it('is optional: omitted stays undefined, [] stays empty', () => {
    expect(featuredWorkSchema.parse(base).media).toBeUndefined();
    expect(parse([]).data?.media).toEqual([]);
  });

  it('accepts one or two items and trims the label, turning blank into null', () => {
    expect(
      parse([
        { mediaId: 'a', label: '  FP16  ' },
        { mediaId: 'b', label: '  ' },
      ]).data?.media
    ).toEqual([
      { mediaId: 'a', label: 'FP16' },
      { mediaId: 'b', label: null },
    ]);
    expect(parse([{ mediaId: 'a' }]).data?.media).toEqual([
      { mediaId: 'a', label: undefined },
    ]);
  });

  it('allows a 24-character label and refuses 25', () => {
    expect(parse([{ mediaId: 'a', label: 'x'.repeat(24) }]).success).toBe(true);
    expect(parse([{ mediaId: 'a', label: 'x'.repeat(25) }]).success).toBe(
      false
    );
  });

  it('refuses a third item, an empty id and the same file twice', () => {
    expect(
      parse([{ mediaId: 'a' }, { mediaId: 'b' }, { mediaId: 'c' }]).success
    ).toBe(false);
    expect(parse([{ mediaId: '' }]).success).toBe(false);
    const twice = parse([{ mediaId: 'a' }, { mediaId: 'a' }]);
    expect(twice.success).toBe(false);
    expect(twice.error?.issues[0]?.message).toBe(
      'The same file cannot be used twice'
    );
  });
});
