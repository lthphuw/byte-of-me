import type { FeaturedWorkGithub, GithubPullRequestRef } from '@/entities/featured-work/model/types';

export type RepositoryNode = {
  nameWithOwner: string;
  stargazerCount: number;
  pullRequest: { number: number } | null;
} | null;

/**
 * Variables, not string interpolation: owner/repo come from a user-authored URL.
 * Callers must not send a request for an empty `refs`.
 */
export function buildPullRequestQuery(refs: GithubPullRequestRef[]) {
  const variables: Record<string, string | number> = {};
  const params: string[] = [];
  const fields = refs.map((ref, i) => {
    variables[`o${i}`] = ref.owner;
    variables[`n${i}`] = ref.repo;
    variables[`p${i}`] = ref.number;
    params.push(`$o${i}: String!`, `$n${i}: String!`, `$p${i}: Int!`);
    return `pr${i}: repository(owner: $o${i}, name: $n${i}) { nameWithOwner stargazerCount pullRequest(number: $p${i}) { number } }`;
  });
  return { query: `query (${params.join(', ')}) { ${fields.join(' ')} }`, variables };
}

export function mapPullRequestResponse(
  refs: GithubPullRequestRef[],
  data: Record<string, RepositoryNode>
): Array<FeaturedWorkGithub | null> {
  return refs.map((_, i) => {
    const node = data[`pr${i}`];
    if (!node?.pullRequest) return null;
    return { repo: node.nameWithOwner, stars: node.stargazerCount };
  });
}
