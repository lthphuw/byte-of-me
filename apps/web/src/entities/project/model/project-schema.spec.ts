import { describe, expect, it } from 'bun:test';

import { projectSchema } from './project-schema';

const parse = (links: { githubLink?: string; liveLink?: string }) =>
  projectSchema.safeParse({
    slug: 'a',
    isPublished: false,
    translations: [],
    ...links,
  });

describe('projectSchema links', () => {
  it('accepts http(s), an empty string and an omitted link', () => {
    expect(
      parse({ githubLink: 'https://github.com/x', liveLink: 'http://a.test' })
        .success
    ).toBe(true);
    expect(parse({ githubLink: '', liveLink: '' }).success).toBe(true);
    expect(parse({}).success).toBe(true);
  });

  it('trims the stored link', () => {
    const result = parse({ liveLink: '  https://a.test  ' });

    expect(result.data?.liveLink).toBe('https://a.test');
  });

  it.each(['javascript:alert(1)', 'data:text/html,x', 'ftp://a.test', 'nope'])(
    'refuses %p with the validation key',
    (value) => {
      for (const field of ['githubLink', 'liveLink'] as const) {
        const result = parse({ [field]: value });

        expect(result.success).toBe(false);
        expect(
          result.error?.issues.some(
            (i) => i.message === 'validation.invalidUrl'
          )
        ).toBe(true);
      }
    }
  );
});
