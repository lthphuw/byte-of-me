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

const BODY = JSON.stringify({
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [{ type: 'text', text: 'Calibrated on 512 images.' }],
    },
  ],
});
const EMPTY_DOC = JSON.stringify({
  type: 'doc',
  content: [{ type: 'paragraph' }],
});

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

  it('reports a blank English title even when only Vietnamese was filled', async () => {
    const result = await run([
      { language: 'en', title: '', description: '' },
      { language: 'vi', title: 'Tiêu đề', description: '' },
    ]);

    expect(result.errors.translations?.[0]?.title?.message).toBe(
      'Title is required'
    );
    expect(result.errors.translations?.[1]).toBeUndefined();
  });

  it('keeps the error on Vietnamese when only its title is missing', async () => {
    const result = await run([
      { language: 'en', title: 'A', description: '' },
      { language: 'vi', title: '', description: 'Chỉ có mô tả' },
    ]);

    expect(result.errors.translations?.[0]).toBeUndefined();
    expect(result.errors.translations?.[1]?.title?.message).toBe(
      'Title is required'
    );
  });

  it('keeps the "each language once" error next to the field errors', async () => {
    const result = await run([
      { language: 'en', title: '', description: '' },
      { language: 'vi', title: 'Một', description: '' },
      { language: 'vi', title: 'Hai', description: '' },
    ]);

    expect(result.errors.translations?.[0]?.title?.message).toBe(
      'Title is required'
    );
    expect(result.errors.translations?.root?.message).toBe(
      'Each language may appear once'
    );
  });

  it('keeps a Vietnamese body that has no title, and names the title as missing', async () => {
    const result = await run([
      { language: 'en', title: 'A', description: '', details: null },
      { language: 'vi', title: '', description: '', details: BODY },
    ]);

    expect(result.errors.translations?.[0]).toBeUndefined();
    expect(result.errors.translations?.[1]?.title?.message).toBe(
      'Title is required'
    );
  });

  it('drops a Vietnamese row whose only content is an empty document', async () => {
    const result = await run([
      { language: 'en', title: 'A', description: '', details: null },
      { language: 'vi', title: '', description: '', details: EMPTY_DOC },
    ]);

    expect(result.errors).toEqual({});
    expect(result.values.translations).toEqual([
      { language: 'en', title: 'A', description: '', details: null },
    ]);
  });

  it('stores an empty document as no body and keeps a body that has text', async () => {
    const result = await run([
      { language: 'en', title: 'A', description: '', details: EMPTY_DOC },
      { language: 'vi', title: 'Tiêu đề', description: '', details: BODY },
    ]);

    expect(result.errors).toEqual({});
    expect(result.values.translations).toEqual([
      { language: 'en', title: 'A', description: '', details: null },
      { language: 'vi', title: 'Tiêu đề', description: '', details: BODY },
    ]);
  });
});
