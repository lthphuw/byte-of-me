/**
 * The form drops blank translations before validating; an error must still
 * land on the field the owner typed into, not on the one that took its index.
 */
import { describe, expect, it } from 'bun:test';

import { featuredWorkResolver } from './featured-work-resolver';

import type { FeaturedWorkFormValues } from '@/entities/featured-work/model/featured-work-schema';

const run = (translations: FeaturedWorkFormValues['translations']) =>
  featuredWorkResolver(
    { isPublished: false, url: '', translations },
    undefined,
    { fields: {}, shouldUseNativeValidation: false }
  );

describe('featuredWorkResolver', () => {
  it('drops a blank Vietnamese translation from the submitted values', async () => {
    const result = await run([
      { language: 'en', title: 'A', description: '' },
      { language: 'vi', title: '', description: '' },
    ]);

    expect(result.errors).toEqual({});
    expect(result.values.translations).toEqual([
      { language: 'en', title: 'A', description: '' },
    ]);
  });

  it('reports a missing title on the blank form instead of submitting nothing', async () => {
    const result = await run([
      { language: 'en', title: '', description: '' },
      { language: 'vi', title: '', description: '' },
    ]);

    expect(result.errors.translations?.[0]?.title?.message).toBe(
      'Title is required'
    );
  });

  it('keeps the error on Vietnamese when English was dropped', async () => {
    const result = await run([
      { language: 'en', title: '', description: '' },
      { language: 'vi', title: '', description: 'Chỉ có mô tả' },
    ]);

    expect(result.errors.translations?.[0]).toBeUndefined();
    expect(result.errors.translations?.[1]?.title?.message).toBe(
      'Title is required'
    );
  });
});
