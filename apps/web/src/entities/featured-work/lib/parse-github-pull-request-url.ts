import type { GithubPullRequestRef } from '@/entities/featured-work/model/types';

const PR_PATH = /^\/([^/]+)\/([^/]+)\/pull\/(\d+)(?:\/.*)?$/;
const GRAPHQL_INT_MAX = 2147483647;
const GITHUB_HOSTS = new Set(['github.com', 'www.github.com']);

/** `https://github.com/{owner}/{repo}/pull/{n}[/files...]` -> its parts, else null. */
export function parseGithubPullRequestUrl(
  url: string
): GithubPullRequestRef | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
  if (!GITHUB_HOSTS.has(parsed.hostname)) return null;

  const match = PR_PATH.exec(parsed.pathname);
  if (!match) return null;
  const number = Number(match[3]);
  // The number is sent as GraphQL `Int!`; an out-of-range value makes GitHub reject the
  // whole batched request, which would blank every featured work.
  if (!Number.isSafeInteger(number) || number <= 0 || number > GRAPHQL_INT_MAX)
    return null;
  return { owner: match[1], repo: match[2], number };
}
