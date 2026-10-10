import type { GithubPullRequestRef } from '@/entities/featured-work/model/types';

const PR_PATH = /^\/([^/]+)\/([^/]+)\/pull\/(\d+)(?:\/.*)?$/;
const GITHUB_HOSTS = new Set(['github.com', 'www.github.com']);

/** `https://github.com/{owner}/{repo}/pull/{n}[/files...]` -> its parts, else null. */
export function parseGithubPullRequestUrl(url: string): GithubPullRequestRef | null {
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
  return { owner: match[1], repo: match[2], number: Number(match[3]) };
}
