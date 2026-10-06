import { describe, expect, it } from 'bun:test';

import { groupByRepo } from './group-by-repo';

import type { GithubPullRequestNode } from '@/entities/open-source/model/types';

function pr(
  repo: string,
  number: number,
  mergedAt: string,
  additions = 1,
  deletions = 0
): GithubPullRequestNode {
  return {
    title: `PR ${number}`,
    number,
    url: `https://github.com/${repo}/pull/${number}`,
    mergedAt,
    additions,
    deletions,
    repository: {
      nameWithOwner: repo,
      url: `https://github.com/${repo}`,
      description: null,
      stargazerCount: 10,
      primaryLanguage: { name: 'Python', color: '#3572A5' },
      owner: { avatarUrl: `https://avatars.githubusercontent.com/${repo}` },
    },
  };
}

describe('groupByRepo', () => {
  it('returns an empty list for no pull requests', () => {
    expect(groupByRepo([])).toEqual([]);
  });

  it('sums PR count and line changes per repo', () => {
    const [repo] = groupByRepo([
      pr('a/x', 1, '2026-01-01T00:00:00Z', 10, 2),
      pr('a/x', 2, '2026-02-01T00:00:00Z', 5, 3),
    ]);

    expect(repo.prCount).toBe(2);
    expect(repo.additions).toBe(15);
    expect(repo.deletions).toBe(5);
  });

  it('orders repos by PR count, then by lines changed', () => {
    const repos = groupByRepo([
      pr('a/small', 1, '2026-01-01T00:00:00Z', 1),
      pr('b/big', 1, '2026-01-01T00:00:00Z', 500),
      pr('c/many', 1, '2026-01-01T00:00:00Z', 1),
      pr('c/many', 2, '2026-01-02T00:00:00Z', 1),
    ]);

    expect(repos.map((r) => r.nameWithOwner)).toEqual([
      'c/many',
      'b/big',
      'a/small',
    ]);
  });

  it('lists the newest PR first inside a repo', () => {
    const [repo] = groupByRepo([
      pr('a/x', 1, '2026-01-01T00:00:00Z'),
      pr('a/x', 3, '2026-03-01T00:00:00Z'),
      pr('a/x', 2, '2026-02-01T00:00:00Z'),
    ]);

    expect(repo.pullRequests.map((p) => p.number)).toEqual([3, 2, 1]);
  });
});
