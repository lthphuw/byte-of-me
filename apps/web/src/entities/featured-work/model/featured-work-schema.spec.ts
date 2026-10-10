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
});
