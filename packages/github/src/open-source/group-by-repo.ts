import type { GithubPullRequestNode, OpenSourceRepo } from './types';

/**
 * One entry per repository: most merged PRs first, ties by lines changed
 * (the home page's top three), the newest PR leading within a repo.
 */
export function groupByRepo(nodes: GithubPullRequestNode[]): OpenSourceRepo[] {
  const repos = new Map<string, OpenSourceRepo>();

  for (const node of nodes) {
    const { repository } = node;
    let repo = repos.get(repository.nameWithOwner);

    if (!repo) {
      repo = {
        nameWithOwner: repository.nameWithOwner,
        url: repository.url,
        description: repository.description,
        stars: repository.stargazerCount,
        language: repository.primaryLanguage,
        avatarUrl: repository.owner.avatarUrl,
        prCount: 0,
        additions: 0,
        deletions: 0,
        pullRequests: [],
      };
      repos.set(repository.nameWithOwner, repo);
    }

    repo.prCount += 1;
    repo.additions += node.additions;
    repo.deletions += node.deletions;
    repo.pullRequests.push({
      number: node.number,
      title: node.title,
      url: node.url,
      mergedAt: node.mergedAt,
      additions: node.additions,
      deletions: node.deletions,
    });
  }

  return [...repos.values()]
    .map((repo) => ({
      ...repo,
      pullRequests: repo.pullRequests.sort((a, b) =>
        b.mergedAt.localeCompare(a.mergedAt)
      ),
    }))
    .sort(
      (a, b) =>
        b.prCount - a.prCount ||
        b.additions + b.deletions - (a.additions + a.deletions)
    );
}
