import { describe, expect, it } from 'bun:test';

import { parseGithubPullRequestUrl } from './parse-github-pull-request-url';

describe('parseGithubPullRequestUrl', () => {
  it('reads owner, repo and number from a PR url', () => {
    expect(parseGithubPullRequestUrl('https://github.com/roboflow/rf-detr/pull/512')).toEqual({
      owner: 'roboflow', repo: 'rf-detr', number: 512,
    });
  });

  it('still parses a PR url with a tab suffix, query or fragment', () => {
    for (const url of [
      'https://github.com/a/b/pull/7/files',
      'https://github.com/a/b/pull/7/commits?diff=split',
      'https://github.com/a/b/pull/7#issuecomment-1',
      'http://www.github.com/a/b/pull/7/',
    ]) {
      expect(parseGithubPullRequestUrl(url)).toEqual({ owner: 'a', repo: 'b', number: 7 });
    }
  });

  it('rejects anything that is not a PR on github.com', () => {
    for (const url of [
      'https://github.com/a/b/issues/7',
      'https://github.com/a/b',
      'https://github.com.evil.com/a/b/pull/7',
      'https://evil.com/github.com/a/b/pull/7',
      'javascript:alert(1)',
      'not a url',
      '',
    ]) {
      expect(parseGithubPullRequestUrl(url)).toBeNull();
    }
  });
});
