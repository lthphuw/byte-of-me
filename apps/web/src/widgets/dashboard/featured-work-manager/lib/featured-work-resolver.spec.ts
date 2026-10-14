/**
 * The form drops blank translations before validating; an error must still
 * land on the field the owner typed into, not on the one that took its index.
 */
import { describe, expect, it } from 'bun:test';

import { featuredWorkResolver } from './featured-work-resolver';

import type { FeaturedWorkFormValues } from '@/entities/featured-work/model/featured-work-schema';

const run = (translations: FeaturedWorkFormValues['translations']) =>
  featuredWorkResolver({ translations }, undefined, {
    fields: {},
    shouldUseNativeValidation: false,
  });

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
      { language: 'en', title: 'A' },
      { language: 'vi', title: '' },
    ]);

    expect(result.errors).toEqual({});
    expect(result.values.translations).toEqual([
      { language: 'en', title: 'A' },
    ]);
  });

  it('reports a missing title on the blank form instead of submitting nothing', async () => {
    const result = await run([
      { language: 'en', title: '' },
      { language: 'vi', title: '' },
    ]);

    expect(result.errors.translations?.[0]?.title?.message).toBe(
      'validation.required'
    );
  });

  it('reports a blank English title even when only Vietnamese was filled', async () => {
    const result = await run([
      { language: 'en', title: '' },
      { language: 'vi', title: 'Tiêu đề' },
    ]);

    expect(result.errors.translations?.[0]?.title?.message).toBe(
      'validation.required'
    );
    expect(result.errors.translations?.[1]).toBeUndefined();
  });

  it('keeps the error on Vietnamese when only its title is missing', async () => {
    const result = await run([
      { language: 'en', title: 'A' },
      { language: 'vi', title: '', details: BODY },
    ]);

    expect(result.errors.translations?.[0]).toBeUndefined();
    expect(result.errors.translations?.[1]?.title?.message).toBe(
      'validation.required'
    );
  });

  it('keeps the "each language once" error next to the field errors', async () => {
    const result = await run([
      { language: 'en', title: '' },
      { language: 'vi', title: 'Một' },
      { language: 'vi', title: 'Hai' },
    ]);

    expect(result.errors.translations?.[0]?.title?.message).toBe(
      'validation.required'
    );
    expect(result.errors.translations?.root?.message).toBe(
      'validation.duplicateLanguage'
    );
  });

  it('keeps a Vietnamese body that has no title, and names the title as missing', async () => {
    const result = await run([
      { language: 'en', title: 'A', details: null },
      { language: 'vi', title: '', details: BODY },
    ]);

    expect(result.errors.translations?.[0]).toBeUndefined();
    expect(result.errors.translations?.[1]?.title?.message).toBe(
      'validation.required'
    );
  });

  it('drops a Vietnamese row whose only content is an empty document', async () => {
    const result = await run([
      { language: 'en', title: 'A', details: null },
      { language: 'vi', title: '', details: EMPTY_DOC },
    ]);

    expect(result.errors).toEqual({});
    expect(result.values.translations).toEqual([
      { language: 'en', title: 'A', details: null },
    ]);
  });

  it('stores an empty document as no body and keeps a body that has text', async () => {
    const result = await run([
      { language: 'en', title: 'A', details: EMPTY_DOC },
      { language: 'vi', title: 'Tiêu đề', details: BODY },
    ]);

    expect(result.errors).toEqual({});
    expect(result.values.translations).toEqual([
      { language: 'en', title: 'A', details: null },
      { language: 'vi', title: 'Tiêu đề', details: BODY },
    ]);
  });
});
