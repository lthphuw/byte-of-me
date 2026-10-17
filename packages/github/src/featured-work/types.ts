export interface GithubPullRequestRef {
  owner: string;
  repo: string;
  number: number;
}

/** GitHub's own pull request state. The UI shows it as a text label, never as colour alone. */
export type FeaturedWorkPullRequestState = 'OPEN' | 'MERGED' | 'CLOSED';

/** What GitHub says about one pull request, as the homepage row shows it. */
export interface FeaturedWorkGithub {
  repo: string;
  stars: number;
  title: string;
  state: FeaturedWorkPullRequestState;
}
