/**
 * Homepage contract: published works only, in order, capped at six; a work with no
 * usable translation is skipped; GitHub facts can never fail the section.
 * Prisma's delegate is replaced and the GitHub fetcher injected: no database, no network.
 */
import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import { beforeEach, describe, expect, it, mock, spyOn } from 'bun:test';

import { getPublicFeaturedWorks } from './get-public-featured-works';

import type { FeaturedWorkGithubDeps } from '@/entities/featured-work/lib/get-featured-work-github';
import { loadPublicFeaturedWorks, toRows } from '@/entities/featured-work/lib/load-public-featured-works';
import type {
  FeaturedWorkGithub,
  GithubPullRequestRef,
} from '@/entities/featured-work/model/types';

const findMany = mock();
Object.defineProperty(prisma, 'featuredWork', {
  value: { findMany },
  writable: true,
  configurable: true,
});

const PR_URL = 'https://github.com/roboflow/rf-detr/pull/512';
const GITHUB: FeaturedWorkGithub = { repo: 'roboflow/rf-detr', stars: 4200, merged: true };

const DETAILS_EN = doc('How it was done.');
const DETAILS_VI = doc('Cách làm.');

/** A stored TipTap document with one paragraph of text, the codec the dashboard writes. */
function doc(text: string): string {
  return JSON.stringify({
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
  });
}

function row(id: string, url: string | null = null, title = `Work ${id}`) {
  return {
    id,
    url,
    translations: [
      { language: 'en', title, description: `About ${id}`, details: null },
    ],
  };
}

function makeDeps(overrides: Partial<FeaturedWorkGithubDeps> = {}) {
  const fetchGithub = mock(
    async (_refs: GithubPullRequestRef[], _token: string) => [GITHUB]
  );
  const deps: FeaturedWorkGithubDeps = {
    getToken: () => 'token',
    fetchGithub: fetchGithub as unknown as FeaturedWorkGithubDeps['fetchGithub'],
    ...overrides,
  };
  return { deps, fetchGithub };
}

async function works(deps: FeaturedWorkGithubDeps) {
  const res = await loadPublicFeaturedWorks(deps);
  if (!res.success) throw new Error(`expected success, got ${res.errorMsg}`);
  return res.data.works;
}

describe('toRows', () => {
  it('falls back to the en translation when the visitor locale has none', () => {
    const rows = toRows([row('a')], 'vi');

    expect(rows).toEqual([
      {
        id: 'a',
        title: 'Work a',
        description: 'About a',
        detailsHtml: null,
        url: null,
        host: null,
      },
    ]);
  });

  it('prefers the visitor locale over en', () => {
    const rows = toRows(
      [
        {
          id: 'a',
          url: null,
          translations: [
            { language: 'en', title: 'Hello', description: null, details: null },
            { language: 'vi', title: 'Xin chào', description: null, details: null },
          ],
        },
      ],
      'vi'
    );

    expect(rows[0]?.title).toBe('Xin chào');
  });

  it('skips a work with no translations or an empty title instead of throwing', () => {
    const rows = toRows(
      [
        { id: 'none', url: null, translations: [] },
        row('blank', null, ''),
        row('ok'),
      ],
      'en'
    );

    expect(rows.map((r) => r.id)).toEqual(['ok']);
  });

  it('falls back to en when the visitor locale translation has a blank title', () => {
    const rows = toRows(
      [
        {
          id: 'a',
          url: null,
          translations: [
            { language: 'en', title: 'Hello', description: 'About', details: null },
            { language: 'vi', title: '  ', description: 'Mô tả', details: null },
          ],
        },
      ],
      'vi'
    );

    expect(rows.map((r) => [r.id, r.title, r.description])).toEqual([
      ['a', 'Hello', 'About'],
    ]);
  });
});

describe('toRows url handling', () => {
  it.each([
    ['a javascript: url', 'javascript:alert(1)'],
    ['a data: url', 'data:text/html,x'],
    ['text that is not a url', 'not a url'],
  ])('keeps the work but drops %s and its host', (_label, url) => {
    const rows = toRows([row('a', url)], 'en');

    expect(rows).toHaveLength(1);
    expect(rows[0]?.url).toBeNull();
    expect(rows[0]?.host).toBeNull();
  });

  it('keeps an https url and strips a leading www from its host', () => {
    const rows = toRows([row('a', 'https://www.example.com/x')], 'en');

    expect(rows[0]?.url).toBe('https://www.example.com/x');
    expect(rows[0]?.host).toBe('example.com');
  });
});

describe('details body', () => {
  /** A translation as the query returns it, with a body. */
  const translation = (
    language: string,
    details: string | null,
    title = `Title ${language}`
  ) => ({ language, title, description: null, details });

  const work = (
    translations: ReturnType<typeof translation>[]
  ): Parameters<typeof toRows>[0] => [{ id: 'a', url: null, translations }];

  it('renders the stored body to sanitized HTML, not the stored JSON', () => {
    const [detailsRow] = toRows(
      work([translation('en', DETAILS_EN)]),
      'en'
    );

    expect(detailsRow?.detailsHtml).toBe('<p>How it was done.</p>');
  });

  it('neutralizes script text and unsafe link targets in the body', () => {
    const hostile = JSON.stringify({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: '<script>alert(1)</script>' },
            {
              type: 'text',
              text: 'click',
              marks: [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }],
            },
          ],
        },
      ],
    });
    const [hostileRow] = toRows(work([translation('en', hostile)]), 'en');

    expect(hostileRow?.detailsHtml).toContain('click');
    expect(hostileRow?.detailsHtml).not.toContain('<script');
    expect(hostileRow?.detailsHtml).not.toContain('javascript:');
  });

  it.each([
    ['null', null],
    ['an empty string', ''],
    ['an empty document', JSON.stringify({ type: 'doc', content: [{ type: 'paragraph' }] })],
    ['a whitespace-only document', doc('   ')],
  ])('gives no body for %s', (_label, details) => {
    const [blankRow] = toRows(work([translation('en', details)]), 'en');

    expect(blankRow?.detailsHtml).toBeNull();
  });

  it.each([
    ['truncated JSON', '{"type":'],
    ['a bare number', '42'],
    ['the literal null', 'null'],
    ['a JSON array', '[1,2,3]'],
  ])('gives no body for %s, and does not throw', (_label, details) => {
    let result: ReturnType<typeof toRows> = [];
    expect(() => {
      result = toRows(work([translation('en', details)]), 'en');
    }).not.toThrow();

    expect(result[0]?.detailsHtml).toBeNull();
  });

  it('gives a vi row with no vi body no body, even when en has one', () => {
    const [viRow] = toRows(
      work([
        translation('en', DETAILS_EN),
        translation('vi', null, 'Tiêu đề'),
      ]),
      'vi'
    );

    expect(viRow?.title).toBe('Tiêu đề');
    expect(viRow?.detailsHtml).toBeNull();
  });

  it("renders the visitor's own language body when it has one", () => {
    const [viRow] = toRows(
      work([
        translation('en', DETAILS_EN),
        translation('vi', DETAILS_VI, 'Tiêu đề'),
      ]),
      'vi'
    );

    expect(viRow?.detailsHtml).toBe('<p>Cách làm.</p>');
  });

  it('carries the body through the loader to the homepage row', async () => {
    findMany.mockReset().mockResolvedValue([
      {
        id: 'a',
        url: null,
        translations: [translation('en', DETAILS_EN)],
      },
    ]);

    const result = await works(makeDeps().deps);

    expect(result[0]?.detailsHtml).toBe('<p>How it was done.</p>');
  });

  it('gives no body for a node type the render schema does not know', () => {
    const [unknownRow] = toRows(
      work([
        translation(
          'en',
          JSON.stringify({ type: 'doc', content: [{ type: 'bogus' }] })
        ),
      ]),
      'en'
    );

    expect(unknownRow?.detailsHtml).toBeNull();
  });

  it('gives no body for a bare node that is not a document', () => {
    // A paragraph at the top level parses and has text, but it is not a body.
    const [bareRow] = toRows(
      work([
        translation(
          'en',
          JSON.stringify({
            type: 'paragraph',
            content: [{ type: 'text', text: 'Loose paragraph' }],
          })
        ),
      ]),
      'en'
    );

    expect(bareRow?.detailsHtml).toBeNull();
  });

  it('renders a document with lists and headings to HTML', () => {
    const rich = JSON.stringify({
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 3 },
          content: [{ type: 'text', text: 'Results' }],
        },
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Export 2x faster' }],
                },
              ],
            },
          ],
        },
      ],
    });
    const [richRow] = toRows(work([translation('en', rich)]), 'en');

    expect(richRow?.detailsHtml).toContain('Results');
    expect(richRow?.detailsHtml).toContain('<li>');
    expect(richRow?.detailsHtml).toContain('Export 2x faster');
    expect(richRow?.detailsHtml).not.toContain('"type"');
  });
});

describe('loadPublicFeaturedWorks', () => {
  beforeEach(() => {
    findMany.mockReset().mockResolvedValue([]);
  });

  it('selects only published works, ordered and capped at six', async () => {
    findMany.mockResolvedValue(
      Array.from({ length: 6 }, (_, i) => row(`w${i}`))
    );

    const result = await works(makeDeps().deps);

    expect(findMany).toHaveBeenCalledTimes(1);
    const args = findMany.mock.calls[0]?.[0];
    expect(args.where.isPublished).toBe(true);
    expect(args.orderBy).toEqual([{ sortOrder: 'asc' }, { id: 'asc' }]);
    expect(args.take).toBe(6);
    expect(args.select.translations.where.language.in).toEqual(['en']);
    expect(args.select.translations.select.details).toBe(true);
    expect(result.map((w) => w.id)).toEqual(['w0', 'w1', 'w2', 'w3', 'w4', 'w5']);
  });

  it('renders rows with no github when GITHUB_TOKEN is unset, and never calls GitHub', async () => {
    const warn = spyOn(logger, 'warn').mockImplementation(() => {});
    findMany.mockResolvedValue([row('a', PR_URL)]);
    const { deps, fetchGithub } = makeDeps({ getToken: () => undefined });

    const result = await works(deps);

    expect(result).toEqual([
      {
        id: 'a',
        title: 'Work a',
        description: 'About a',
        detailsHtml: null,
        url: PR_URL,
        host: 'github.com',
        github: null,
      },
    ]);
    expect(fetchGithub).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('attaches GitHub facts to the pull-request row only, and a host to every linked row', async () => {
    findMany.mockResolvedValue([
      row('pr', PR_URL),
      row('blog', 'https://www.example.com/post'),
      row('bare'),
    ]);
    const { deps, fetchGithub } = makeDeps();

    const result = await works(deps);

    expect(fetchGithub).toHaveBeenCalledTimes(1);
    expect(fetchGithub.mock.calls[0]).toEqual([
      [{ owner: 'roboflow', repo: 'rf-detr', number: 512 }],
      'token',
    ]);
    expect(result.map((w) => [w.id, w.host, w.github])).toEqual([
      ['pr', 'github.com', GITHUB],
      ['blog', 'example.com', null],
      ['bare', null, null],
    ]);
  });

  it('does not call GitHub when no row links a pull request', async () => {
    findMany.mockResolvedValue([row('blog', 'https://example.com/post')]);
    const { deps, fetchGithub } = makeDeps();

    await works(deps);

    expect(fetchGithub).not.toHaveBeenCalled();
  });

  it('keeps the section when GitHub fails', async () => {
    const warn = spyOn(logger, 'warn').mockImplementation(() => {});
    const error = spyOn(logger, 'error').mockImplementation(() => {});
    findMany.mockResolvedValue([row('a', PR_URL)]);
    const { deps } = makeDeps({
      fetchGithub: async () => {
        throw new Error('GitHub GraphQL responded 502');
      },
    });

    const result = await works(deps);

    expect(result).toHaveLength(1);
    expect(result[0]?.github).toBeNull();
    expect(result[0]?.host).toBe('github.com');
    warn.mockRestore();
    error.mockRestore();
  });

  it('reports a failed database read through the envelope', async () => {
    const error = spyOn(logger, 'error').mockImplementation(() => {});
    findMany.mockRejectedValue(new Error('connection refused'));

    const res = await loadPublicFeaturedWorks(makeDeps().deps);

    expect(res.success).toBe(false);
    if (res.success) throw new Error('unreachable');
    expect(res.errorMsg).not.toContain('connection refused');
    error.mockRestore();
  });
});

describe('getPublicFeaturedWorks', () => {
  it('is the argument-less entry point the homepage calls', async () => {
    findMany.mockReset().mockResolvedValue([row('a')]);

    const res = await getPublicFeaturedWorks();

    expect(res.success).toBe(true);
    if (!res.success) throw new Error('unreachable');
    expect(res.data.works.map((w) => w.id)).toEqual(['a']);
  });
});
