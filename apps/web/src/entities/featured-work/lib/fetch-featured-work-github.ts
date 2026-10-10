import {
  buildPullRequestQuery,
  mapPullRequestResponse,
  type RepositoryNode,
} from '@/entities/featured-work/lib/github-pull-request-query';
import type {
  FeaturedWorkGithub,
  GithubPullRequestRef,
} from '@/entities/featured-work/model/types';

const GITHUB_GRAPHQL = 'https://api.github.com/graphql';
const TIMEOUT_MS = 8000;

interface GraphqlResponse {
  data?: Record<string, RepositoryNode> | null;
  errors?: Array<{ message: string }>;
}

/**
 * Repo name, stars and merged state for each pull request, aligned to `refs`
 * (null where GitHub could not resolve one). Throws on a transport failure or
 * when the response carries no `data`; partial `data` next to `errors` is used,
 * the mapper nulls the aliases that failed.
 */
export async function fetchFeaturedWorkGithub(
  refs: GithubPullRequestRef[],
  token: string,
  fetchImpl: typeof fetch = fetch
): Promise<Array<FeaturedWorkGithub | null>> {
  // An empty batch is not valid GraphQL, so it must not reach the network.
  if (refs.length === 0) return [];

  const response = await fetchImpl(GITHUB_GRAPHQL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'byte-of-me',
    },
    body: JSON.stringify(buildPullRequestQuery(refs)),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`GitHub GraphQL responded ${response.status}`);
  }

  const body = (await response.json()) as GraphqlResponse;

  if (!body.data) {
    throw new Error(
      `GitHub GraphQL error: ${body.errors?.map((e) => e.message).join('; ') ?? 'no data'}`
    );
  }

  return mapPullRequestResponse(refs, body.data);
}
