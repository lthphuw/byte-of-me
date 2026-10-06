export interface OpenSourcePullRequest {
  number: number;
  title: string;
  url: string;
  /** ISO string: the value crosses the `unstable_cache` JSON boundary. */
  mergedAt: string;
  additions: number;
  deletions: number;
}

export interface OpenSourceRepo {
  /** `owner/name`, which is also the display label. */
  nameWithOwner: string;
  url: string;
  description: string | null;
  stars: number;
  language: { name: string; color: string | null } | null;
  avatarUrl: string;
  prCount: number;
  additions: number;
  deletions: number;
  /** Newest first. */
  pullRequests: OpenSourcePullRequest[];
}

/** One merged pull request as GitHub's GraphQL search returns it. */
export interface GithubPullRequestNode {
  title: string;
  number: number;
  url: string;
  mergedAt: string;
  additions: number;
  deletions: number;
  repository: {
    nameWithOwner: string;
    url: string;
    description: string | null;
    stargazerCount: number;
    primaryLanguage: { name: string; color: string | null } | null;
    owner: { avatarUrl: string };
  };
}
