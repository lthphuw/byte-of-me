import { RepoSummary, type RepoSummaryLabels } from './repo-summary';

import type { OpenSourceRepo } from '@/entities/open-source/model/types';

/** A home-page row: the whole repo line is one link out to GitHub. */
export function RepoLinkRow({
  repo,
  labels,
}: {
  repo: OpenSourceRepo;
  labels: RepoSummaryLabels;
}) {
  return (
    <a
      href={repo.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block px-4 py-4 transition-colors hover:bg-accent/50 focus-visible:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring md:px-5"
    >
      <RepoSummary repo={repo} labels={labels} />
    </a>
  );
}
