/**
 * The homepage section's contract: only published works, in the owner's order and
 * capped at six; a work with no usable translation is skipped; GitHub facts are
 * optional garnish that can never fail or blank the section. Prisma's delegate is
 * replaced (Prisma 7 synthesizes methods per access, so `spyOn` would be bypassed)
 * and the GitHub fetcher is injected, so nothing here touches a database or GitHub.
 */
import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import { beforeEach, describe, expect, it, mock, spyOn } from 'bun:test';

import { getPublicFeaturedWorks } from './get-public-featured-works';

import type { FeaturedWorkGithubDeps } from '@/entities/featured-work/lib/get-featured-work-github';
import { loadPublicFeaturedWorks, toRows } from '@/entities/featured-work/lib/load-public-featured-works';
import type { FeaturedWorkGithub, GithubPullRequestRef } from '@/entities/featured-work/model/types';

const findMany = mock();
Object.defineProperty(prisma, 'featuredWork', {
  value: { findMany },
  writable: true,
  configurable: true,
});

const PR_URL = 'https://github.com/roboflow/rf-detr/pull/512';
const GITHUB: FeaturedWorkGithub = { repo: 'roboflow/rf-detr', stars: 4200, merged: true };

function row(id: string, url: string | null = null, title = `Work ${id}`) {
  return {
    id,
    url,
    translations: [{ language: 'en', title, description: `About ${id}` }],
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
      { id: 'a', title: 'Work a', description: 'About a', url: null },
    ]);
  });

  it('prefers the visitor locale over en', () => {
    const rows = toRows(
      [
        {
          id: 'a',
          url: null,
          translations: [
            { language: 'en', title: 'Hello', description: null },
            { language: 'vi', title: 'Xin chào', description: null },
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
