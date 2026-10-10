import { describe, expect, it } from 'bun:test';

import { buildPullRequestQuery, mapPullRequestResponse } from './github-pull-request-query';

const refs = [
  { owner: 'roboflow', repo: 'rf-detr', number: 512 },
  { owner: 'a', repo: 'b', number: 7 },
];

describe('buildPullRequestQuery', () => {
  it('passes owner, repo and number as variables, never inlined in the query text', () => {
    const { query, variables } = buildPullRequestQuery([
      { owner: 'x"} evil', repo: 'r', number: 1 },
    ]);
    expect(query).not.toContain('evil');
    expect(variables).toEqual({ o0: 'x"} evil', n0: 'r', p0: 1 });
  });

  it('aliases one repository lookup per ref', () => {
    const { query } = buildPullRequestQuery(refs);
    expect(query).toContain('pr0: repository(');
    expect(query).toContain('pr1: repository(');
  });
});

describe('mapPullRequestResponse', () => {
  it('maps each alias back to its ref by position', () => {
    const out = mapPullRequestResponse(refs, {
      pr0: { nameWithOwner: 'roboflow/rf-detr', stargazerCount: 4200, pullRequest: { number: 512 } },
      pr1: { nameWithOwner: 'a/b', stargazerCount: 3, pullRequest: { number: 7 } },
    });
    expect(out).toEqual([
      { repo: 'roboflow/rf-detr', stars: 4200 },
      { repo: 'a/b', stars: 3 },
    ]);
  });

  it('degrades only the entries GitHub could not resolve', () => {
    const out = mapPullRequestResponse(refs, {
      pr0: null,
      pr1: { nameWithOwner: 'a/b', stargazerCount: 3, pullRequest: null },
    });
    expect(out).toEqual([null, null]);
    const mixed = mapPullRequestResponse(refs, {
      pr0: null,
      pr1: { nameWithOwner: 'a/b', stargazerCount: 3, pullRequest: { number: 512 } },
    });
    expect(mixed).toEqual([null, { repo: 'a/b', stars: 3 }]);
  });

  it('returns an empty list for no refs', () => {
    expect(mapPullRequestResponse([], {})).toEqual([]);
  });

  it('maps a missing alias to null without throwing', () => {
    expect(mapPullRequestResponse([refs[0]], {})).toEqual([null]);
  });
});
