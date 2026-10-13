import { describe, expect, it } from 'bun:test';

import { blogFormSchema, type BlogFormValues } from './blog-schema';

import type { RichTextDoc } from '@/shared/lib/rich-text-doc-schema';

const doc: RichTextDoc = { type: 'doc', content: [{ type: 'paragraph' }] };

const validValues: BlogFormValues = {
  slug: 'hello-world',
  isPublished: false,
  translations: [{ language: 'en', title: 'Hello', content: doc }],
};

describe('blogFormSchema', () => {
  it('accepts a lowercase hyphenated slug and a titled translation', () => {
    expect(blogFormSchema.safeParse(validValues).success).toBe(true);
  });

  it('reports a blank title with a validation key, never English text', () => {
    const result = blogFormSchema.safeParse({
      ...validValues,
      translations: [{ ...validValues.translations[0], title: '   ' }],
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('validation.required');
  });

  it('rejects a slug that is not lowercase words joined by hyphens', () => {
    const result = blogFormSchema.safeParse({
      ...validValues,
      slug: 'Hello World',
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('validation.invalidSlug');
  });

  it('rejects a body that is not a TipTap document', () => {
    const result = blogFormSchema.safeParse({
      ...validValues,
      translations: [
        { ...validValues.translations[0], content: '<p>Hello</p>' },
      ],
    });

    expect(result.success).toBe(false);
  });
});
