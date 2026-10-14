/**
 * Homepage contract: every work, in order, capped at six; a work with no
 * usable translation is skipped; GitHub facts can never fail the section.
 * Prisma's delegate is replaced and the GitHub fetcher injected: no database, no network.
 */
import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import { beforeEach, describe, expect, it, mock, spyOn } from 'bun:test';

import { getPublicFeaturedWorks } from './get-public-featured-works';

import type { FeaturedWorkGithubDeps } from '@/entities/featured-work/lib/get-featured-work-github';
import {
  loadPublicFeaturedWorks,
  toRows,
} from '@/entities/featured-work/lib/load-public-featured-works';
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
const GITHUB: FeaturedWorkGithub = {
  repo: 'roboflow/rf-detr',
  stars: 4200,
  title: 'Export INT8',
  state: 'MERGED',
};

const DETAILS_EN = doc('How it was done.');
const DETAILS_VI = doc('Cách làm.');

/** A stored TipTap document with one paragraph of text, the codec the dashboard writes. */
function doc(text: string): string {
  return JSON.stringify({
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
  });
}

/** A stored work; `url` becomes its one link, `links` a list of them. */
function row(
  id: string,
  url: string | null = null,
  title = `Work ${id}`,
  links: Array<{ id: string; url: string; label: string | null }> = url
    ? [{ id: `${id}-l0`, url, label: null }]
    : []
) {
  return {
    id,
    media: [],
    links,
    translations: [{ language: 'en', title }],
  };
}

function makeDeps(overrides: Partial<FeaturedWorkGithubDeps> = {}) {
  const fetchGithub = mock(
    async (_refs: GithubPullRequestRef[], _token: string) => [GITHUB]
  );
  const deps: FeaturedWorkGithubDeps = {
    getToken: () => 'token',
    fetchGithub:
      fetchGithub as unknown as FeaturedWorkGithubDeps['fetchGithub'],
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
        links: [],
        media: [],
      },
    ]);
  });

  it('prefers the visitor locale over en', () => {
    const rows = toRows(
      [
        {
          id: 'a',
          links: [],
          media: [],
          translations: [
            {
              language: 'en',
              title: 'Hello',
            },
            {
              language: 'vi',
              title: 'Xin chào',
            },
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
        { id: 'none', links: [], media: [], translations: [] },
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
          links: [],
          media: [],
          translations: [
            {
              language: 'en',
              title: 'Hello',
            },
            {
              language: 'vi',
              title: '  ',
            },
          ],
        },
      ],
      'vi'
    );

    expect(rows.map((r) => [r.id, r.title])).toEqual([['a', 'Hello']]);
  });
});

describe('toRows links', () => {
  it.each([
    ['a javascript: url', 'javascript:alert(1)'],
    ['a data: url', 'data:text/html,x'],
    ['text that is not a url', 'not a url'],
  ])('keeps the work but drops a link with %s and its host', (_label, url) => {
    const rows = toRows([row('a', url)], 'en');

    expect(rows).toHaveLength(1);
    expect(rows[0]?.links).toEqual([]);
  });

  it('keeps an https link and strips a leading www from its host', () => {
    const rows = toRows([row('a', 'https://www.example.com/x')], 'en');

    expect(rows[0]?.links).toEqual([
      {
        id: 'a-l0',
        url: 'https://www.example.com/x',
        label: null,
        host: 'example.com',
        pr: null,
      },
    ]);
  });

  it('reads the repo and number from a pull request link', () => {
    const rows = toRows([row('a', PR_URL)], 'en');

    expect(rows[0]?.links[0]?.pr).toEqual({
      repo: 'roboflow/rf-detr',
      number: 512,
    });
  });

  it('keeps the links in the order given and drops a bad one alone', () => {
    const rows = toRows(
      [
        row('a', null, 'Work a', [
          { id: 'l0', url: PR_URL, label: 'INT8' },
          { id: 'l1', url: 'javascript:alert(1)', label: null },
          { id: 'l2', url: 'https://example.com/post', label: null },
        ]),
      ],
      'en'
    );

    expect(rows[0]?.links.map((link) => [link.id, link.label])).toEqual([
      ['l0', 'INT8'],
      ['l2', null],
    ]);
  });

  it('serves no more than six links to a visitor', () => {
    const links = Array.from({ length: 7 }, (_, i) => ({
      id: `l${i}`,
      url: `https://example.com/${i}`,
      label: null,
    }));
    const rows = toRows([row('a', null, 'Work a', links)], 'en');

    expect(rows[0]?.links.map((link) => link.id)).toEqual([
      'l0',
      'l1',
      'l2',
      'l3',
      'l4',
      'l5',
    ]);
  });
});

describe('demo media', () => {
  const item = (
    id: string,
    url: string,
    mimeType: string,
    label: string | null = null
  ) => ({
    label,
    media: { id, url, mimeType, width: 1920, height: 670 },
  });
  const withMedia = (media: ReturnType<typeof item>[]) => [
    { ...row('a'), media },
  ];

  it('maps the stored pair to id, url, mimeType and label, in the order given', () => {
    const [mediaRow] = toRows(
      withMedia([
        item('m1', 'https://cdn.example/a.mp4', 'video/mp4', 'FP16'),
        item('m2', 'https://cdn.example/b.webm', 'video/webm', null),
      ]),
      'en'
    );

    expect(mediaRow?.media).toEqual([
      {
        id: 'm1',
        url: 'https://cdn.example/a.mp4',
        mimeType: 'video/mp4',
        label: 'FP16',
        width: 1920,
        height: 670,
      },
      {
        id: 'm2',
        url: 'https://cdn.example/b.webm',
        mimeType: 'video/webm',
        label: null,
        width: 1920,
        height: 670,
      },
    ]);
  });

  it('drops an item that is not an http(s) url or not an image or accepted video, and keeps its sibling', () => {
    const [mediaRow] = toRows(
      withMedia([
        item('bad1', 'javascript:alert(1)', 'image/png'),
        item('bad2', 'data:image/png;base64,AAAA', 'image/png'),
        item('bad3', 'https://cdn.example/x.pdf', 'application/pdf'),
        item('bad4', 'https://cdn.example/x.mov', 'video/quicktime'),
        item('ok', 'https://cdn.example/y.gif', 'image/gif', 'INT8'),
      ]),
      'en'
    );

    expect(mediaRow?.media.map((m) => m.id)).toEqual(['ok']);
  });

  it('never serves more than two items, and the work still shows without media', () => {
    const [mediaRow] = toRows(
      withMedia([
        item('1', 'https://cdn.example/1.png', 'image/png'),
        item('2', 'https://cdn.example/2.png', 'image/png'),
        item('3', 'https://cdn.example/3.png', 'image/png'),
      ]),
      'en'
    );
    expect(mediaRow?.media.map((m) => m.id)).toEqual(['1', '2']);

    const [bare] = toRows(
      withMedia([item('bad', 'ftp://x/y', 'image/png')]),
      'en'
    );
    expect(bare?.id).toBe('a');
    expect(bare?.media).toEqual([]);
  });

  it('asks the database for the pair in slot order', async () => {
    findMany.mockReset().mockResolvedValue([]);
    await works(makeDeps().deps);

    const args = findMany.mock.calls[0]?.[0];
    expect(args.select.media.orderBy).toEqual({ sortOrder: 'asc' });
    expect(args.select.media.select.media.select).toEqual({
      id: true,
      url: true,
      mimeType: true,
      width: true,
      height: true,
    });
  });
});

describe('loadPublicFeaturedWorks', () => {
  beforeEach(() => {
    findMany.mockReset().mockResolvedValue([]);
  });

  it("selects each work's links in position order", async () => {
    findMany.mockResolvedValue([row('a', PR_URL)]);

    await works(makeDeps().deps);

    const args = findMany.mock.calls[0]?.[0];
    expect(args.select.links.orderBy).toEqual({ sortOrder: 'asc' });
    expect(args.select.links.select).toEqual({ id: true, url: true, label: true });
  });

  it('selects every work, ordered and capped at six', async () => {
    findMany.mockResolvedValue(
      Array.from({ length: 6 }, (_, i) => row(`w${i}`))
    );

    const result = await works(makeDeps().deps);

    expect(findMany).toHaveBeenCalledTimes(1);
    const args = findMany.mock.calls[0]?.[0];
    expect(args.where).not.toHaveProperty('isPublished');
    expect(args.orderBy).toEqual([{ sortOrder: 'asc' }, { id: 'asc' }]);
    expect(args.take).toBe(6);
    expect(args.select.translations.where.language.in).toEqual(['en']);
    expect(result.map((w) => w.id)).toEqual([
      'w0',
      'w1',
      'w2',
      'w3',
      'w4',
      'w5',
    ]);
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
        media: [],
        links: [
          {
            id: 'a-l0',
            url: PR_URL,
            label: null,
            host: 'github.com',
            pr: { repo: 'roboflow/rf-detr', number: 512 },
            github: null,
          },
        ],
      },
    ]);
    expect(fetchGithub).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('attaches GitHub facts to each pull-request link by its own url, and a host to every link', async () => {
    findMany.mockResolvedValue([
      row('a', null, 'Work a', [
        { id: 'pr', url: PR_URL, label: 'INT8' },
        { id: 'pr2', url: 'https://github.com/a/b/pull/7', label: null },
        { id: 'blog', url: 'https://www.example.com/post', label: null },
      ]),
    ]);
    const fetchGithub = mock(async (refs: GithubPullRequestRef[], _token: string) =>
      refs.map((ref) =>
        ref.repo === 'rf-detr'
          ? GITHUB
          : { repo: 'a/b', stars: 3, title: 'Keypoints', state: 'OPEN' }
      )
    );
    const { deps } = makeDeps({
      fetchGithub:
        fetchGithub as unknown as FeaturedWorkGithubDeps['fetchGithub'],
    });

    const [work] = await works(deps);

    expect(fetchGithub).toHaveBeenCalledTimes(1);
    // Asked for in url order, the way the GitHub cache keys them.
    expect(fetchGithub.mock.calls[0]).toEqual([
      [
        { owner: 'a', repo: 'b', number: 7 },
        { owner: 'roboflow', repo: 'rf-detr', number: 512 },
      ],
      'token',
    ]);
    expect(work?.links.map((link) => [link.id, link.host, link.github])).toEqual([
      ['pr', 'github.com', GITHUB],
      ['pr2', 'github.com', { repo: 'a/b', stars: 3, title: 'Keypoints', state: 'OPEN' }],
      ['blog', 'example.com', null],
    ]);
  });

  it('does not call GitHub when no link is a pull request', async () => {
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
    expect(result[0]?.links[0]?.github).toBeNull();
    expect(result[0]?.links[0]?.host).toBe('github.com');
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
