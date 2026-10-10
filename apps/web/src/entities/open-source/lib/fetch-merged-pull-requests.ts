import type { GithubPullRequestNode } from '@/entities/open-source/model/types';

const GITHUB_GRAPHQL = 'https://api.github.com/graphql';
const PAGE_SIZE = 100;
// A guard, not a feature: 500 merged PRs to other people's repos is far past
// what this page can usefully show.
const MAX_PAGES = 5;
const TIMEOUT_MS = 8000;

const QUERY = /* GraphQL */ `
  query ($q: String!, $after: String) {
    search(query: $q, type: ISSUE, first: ${PAGE_SIZE}, after: $after) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        ... on PullRequest {
          title
          number
          url
          mergedAt
          additions
          deletions
          repository {
            nameWithOwner
            url
            description
            stargazerCount
            primaryLanguage {
              name
              color
            }
            owner {
              avatarUrl
            }
          }
        }
      }
    }
  }
`;

function isPullRequest(
  node: GithubPullRequestNode | Record<string, unknown>
): node is GithubPullRequestNode {
  // The inline fragment leaves non-PR search hits as empty objects.
  return 'number' in node;
}

interface SearchResponse {
  data?: {
    search: {
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
      nodes: Array<GithubPullRequestNode | Record<string, unknown>>;
    };
  };
  errors?: Array<{ message: string }>;
}

/**
 * Every merged pull request `login` opened against a repo they do not own.
 * Throws on any transport or GraphQL failure so the caller's cache keeps the
 * last good entry instead of storing an empty one.
 */
export async function fetchMergedPullRequests(
  login: string,
  token: string
): Promise<GithubPullRequestNode[]> {
  const q = `author:${login} is:pr is:merged -user:${login}`;
  const pullRequests: GithubPullRequestNode[] = [];
  let after: string | null = null;

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const response = await fetch(GITHUB_GRAPHQL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'byte-of-me',
      },
      body: JSON.stringify({ query: QUERY, variables: { q, after } }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(`GitHub GraphQL responded ${response.status}`);
    }

    const body = (await response.json()) as SearchResponse;

    if (body.errors?.length || !body.data) {
      throw new Error(
        `GitHub GraphQL error: ${
          body.errors?.map((e) => e.message).join('; ') ?? 'no data'
        }`
      );
    }

    const { nodes, pageInfo } = body.data.search;

    for (const node of nodes) {
      if (isPullRequest(node)) pullRequests.push(node);
    }

    if (!pageInfo.hasNextPage) break;
    after = pageInfo.endCursor;
  }

  return pullRequests;
}
