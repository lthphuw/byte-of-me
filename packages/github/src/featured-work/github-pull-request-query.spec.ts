import { describe, expect, it } from 'bun:test';

import {
  buildPullRequestQuery,
  mapPullRequestResponse,
} from './github-pull-request-query';

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

  it('asks for the title and state of each pull request', () => {
    const { query } = buildPullRequestQuery([refs[0]]);
    expect(query).toContain('pullRequest(number: $p0) { number title state }');
  });
});

describe('mapPullRequestResponse', () => {
  it('maps each alias back to its ref by position', () => {
    const out = mapPullRequestResponse(refs, {
      pr0: {
        nameWithOwner: 'roboflow/rf-detr',
        stargazerCount: 4200,
        pullRequest: { number: 512, title: 'Export INT8', state: 'MERGED' },
      },
      pr1: {
        nameWithOwner: 'a/b',
        stargazerCount: 3,
        pullRequest: { number: 7, title: 'Keypoints', state: 'OPEN' },
      },
    });
    expect(out).toEqual([
      { repo: 'roboflow/rf-detr', stars: 4200, title: 'Export INT8', state: 'MERGED' },
      { repo: 'a/b', stars: 3, title: 'Keypoints', state: 'OPEN' },
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
      pr1: {
        nameWithOwner: 'a/b',
        stargazerCount: 3,
        pullRequest: { number: 512, title: 'Keypoints', state: 'CLOSED' },
      },
    });
    expect(mixed).toEqual([
      null,
      { repo: 'a/b', stars: 3, title: 'Keypoints', state: 'CLOSED' },
    ]);
  });

  it('returns an empty list for no refs', () => {
    expect(mapPullRequestResponse([], {})).toEqual([]);
  });

  it('maps a missing alias to null without throwing', () => {
    expect(mapPullRequestResponse([refs[0]], {})).toEqual([null]);
  });
});
