import { describe, expect, it } from 'bun:test';

import { tagSchema } from './tag-schema';

const validValues = {
  slug: 'typescript',
  translations: [{ language: 'en', name: 'TypeScript' }],
};

describe('tagSchema', () => {
  it('accepts a slug and a named translation', () => {
    expect(tagSchema.safeParse(validValues).success).toBe(true);
  });

  it('trims the slug and each name, so surrounding spaces are not saved', () => {
    const result = tagSchema.parse({
      slug: '  typescript  ',
      translations: [{ language: 'en', name: '  TypeScript  ' }],
    });

    expect(result.slug).toBe('typescript');
    expect(result.translations[0]?.name).toBe('TypeScript');
  });

  it('reports a blank slug or name with the validation key', () => {
    const blankSlug = tagSchema.safeParse({ ...validValues, slug: '   ' });
    expect(blankSlug.success).toBe(false);
    expect(blankSlug.error?.issues[0]?.message).toBe('validation.required');

    const blankName = tagSchema.safeParse({
      ...validValues,
      translations: [{ language: 'en', name: '   ' }],
    });
    expect(blankName.success).toBe(false);
    expect(blankName.error?.issues[0]?.message).toBe('validation.required');
  });
});
