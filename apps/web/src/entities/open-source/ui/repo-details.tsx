import { ChevronRight, GitMerge } from 'lucide-react';

import { Diffstat } from './diffstat';
import { RepoSummary, type RepoSummaryLabels } from './repo-summary';

import type { OpenSourceRepo } from '@/entities/open-source/model/types';

export interface RepoDetailsLabels extends RepoSummaryLabels {
  /** "Open on GitHub", the link to the repo itself. */
  openRepo: string;
  formatDate: (iso: string) => string;
}

/**
 * One repo on `/projects`: the summary line opens a list of the merged PRs.
 * Native `<details>` keeps it stateless, keyboard-correct and open to
 * find-in-page, with no client code. The open motion is CSS too: the PR list
 * fades and lifts in everywhere, and `details-smooth` also tweens the height
 * (open and close) in browsers that support `::details-content`.
 */
export function RepoDetails({
  repo,
  labels,
}: {
  repo: OpenSourceRepo;
  labels: RepoDetailsLabels;
}) {
  return (
    <details className="details-smooth group">
      <summary className="flex cursor-pointer list-none items-start gap-3 px-4 py-4 transition-colors hover:bg-accent/50 focus-visible:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring md:px-5 [&::-webkit-details-marker]:hidden">
        <ChevronRight
          aria-hidden
          className="mt-1.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90 motion-reduce:transition-none"
        />
        <div className="min-w-0 flex-1">
          <RepoSummary repo={repo} labels={labels} />
        </div>
      </summary>

      <div className="space-y-3 border-t bg-muted/40 px-4 py-4 motion-safe:group-open:duration-250 motion-safe:group-open:ease-sleek motion-safe:group-open:animate-in motion-safe:group-open:fade-in-0 motion-safe:group-open:slide-in-from-top-1.5 md:px-5 md:py-5">
        <ol className="space-y-3">
          {repo.pullRequests.map((pr) => (
            <li
              key={pr.number}
              className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6"
            >
              <a
                href={pr.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-w-0 items-start gap-2 text-sm hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <GitMerge
                  aria-hidden
                  className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                />
                <span className="min-w-0">
                  {pr.title}{' '}
                  <span className="tabular-nums text-muted-foreground">
                    #{pr.number}
                  </span>
                </span>
              </a>

              <span className="flex shrink-0 items-center gap-4 pl-6 sm:pl-0">
                <time dateTime={pr.mergedAt} className="meta-label">
                  {labels.formatDate(pr.mergedAt)}
                </time>
                <Diffstat additions={pr.additions} deletions={pr.deletions} />
              </span>
            </li>
          ))}
        </ol>

        <a
          href={repo.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-sm text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {labels.openRepo}
        </a>
      </div>
    </details>
  );
}
