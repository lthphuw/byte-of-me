import { describe, expect, it } from 'bun:test';

import { featuredWorkSchema } from './featured-work-schema';

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
    for (const url of ['javascript:alert(1)', 'ftp://x.y/z', 'github.com/a/b']) {
      expect(featuredWorkSchema.safeParse({ ...base, url }).success).toBe(false);
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
    expect(result.error?.issues[0]?.message).toBe('Each language may appear once');
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
});
