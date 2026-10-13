/**
 * Removing an achievement asks first only when it would lose something: a title,
 * a body in any language, or an image. A body with nothing but empty paragraphs
 * is nothing, so a row the author never typed into goes at once.
 */
import { describe, expect, it } from 'bun:test';

import { achievementHasContent } from './achievement-has-content';

const EMPTY_DOC = JSON.stringify({
  type: 'doc',
  content: [{ type: 'paragraph' }],
});
const BODY = JSON.stringify({
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [{ type: 'text', text: 'Top 3% nationwide' }],
    },
  ],
});
const blank = { language: 'en', title: '', content: EMPTY_DOC };

describe('achievementHasContent', () => {
  it('lets an untouched achievement go without asking', () => {
    expect(achievementHasContent({ translations: [blank], imageIds: [] })).toBe(
      false
    );
  });

  it('treats a body that is only whitespace or empty paragraphs as nothing', () => {
    const translations = [
      { language: 'en', title: '  ', content: '' },
      { language: 'vi', title: '', content: EMPTY_DOC },
    ];

    expect(achievementHasContent({ translations, imageIds: [] })).toBe(false);
  });

  it('counts a title on its own', () => {
    const translations = [{ ...blank, title: 'Dean’s List' }];

    expect(achievementHasContent({ translations, imageIds: [] })).toBe(true);
  });

  it('counts a body typed in a language other than the first', () => {
    const translations = [blank, { language: 'vi', title: '', content: BODY }];

    expect(achievementHasContent({ translations, imageIds: [] })).toBe(true);
  });

  it('counts an image even when every text field is empty', () => {
    expect(
      achievementHasContent({ translations: [blank], imageIds: ['media-1'] })
    ).toBe(true);
  });
});
