import { describe, expect, it } from 'bun:test';

import { createUserProfileSchema } from './user-profile-schema';

/** Validates one social link inside an otherwise valid profile. */
const parseLink = (url: string, translateKey?: (key: string) => string) =>
  createUserProfileSchema(translateKey).safeParse({
    socialLinks: [{ platform: 'github', url, sortOrder: 0 }],
    translations: [{ language: 'en' }],
  });

describe('userProfileSchema social link url', () => {
  it('validates the trimmed url and returns it without the surrounding spaces', () => {
    const result = parseLink('  https://github.com/example  ');

    expect(result.success).toBe(true);
    expect(result.data?.socialLinks[0]?.url).toBe('https://github.com/example');
  });

  it('refuses a link that is only spaces, with the url key', () => {
    const result = parseLink('   ', (key) => key);

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('urlInvalid');
  });

  it('refuses a javascript: link even when it is padded with spaces', () => {
    expect(parseLink('  javascript:alert(1)  ').success).toBe(false);
  });
});
