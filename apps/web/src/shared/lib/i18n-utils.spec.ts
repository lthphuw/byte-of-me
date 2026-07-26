import { getTranslatedContent } from './i18n-utils';

const en = { language: 'en', title: 'English' };
const vi = { language: 'vi', title: 'Tiếng Việt' };
const fr = { language: 'fr', title: 'Français' };

describe('getTranslatedContent', () => {
  it('prefers an exact locale match', () => {
    expect(getTranslatedContent([en, vi], 'vi')).toBe(vi);
  });

  it('falls back to English when the locale is missing', () => {
    expect(getTranslatedContent([en, vi], 'fr')).toBe(en);
  });

  it('falls back to the first entry when there is no English either', () => {
    expect(getTranslatedContent([fr, vi], 'de')).toBe(fr);
  });

  it('returns undefined when there are no translations', () => {
    expect(getTranslatedContent([], 'en')).toBeUndefined();
  });

  it('is order-independent for an exact match', () => {
    // Row order out of the database is not guaranteed, so the locale match
    // must not depend on which translation happens to come back first.
    expect(getTranslatedContent([vi, en], 'en')).toBe(en);
    expect(getTranslatedContent([en, vi], 'en')).toBe(en);
  });
});
