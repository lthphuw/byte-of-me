import type { OpenSourceRepo } from '@byte-of-me/github';
import { ArrowRight, Ellipsis, GitPullRequest } from 'lucide-react';

import { openSourceHref } from '@/entities/open-source/model/open-source-url';
import { Diffstat } from '@/entities/open-source/ui/diffstat';
import { PullRequestLink } from '@/entities/open-source/ui/pull-request-link';
import { Link } from '@/shared/i18n/navigation';
import { cn } from '@/shared/lib/utils';
import { TREE_NODE, TreeItem } from '@/shared/ui/tree';
import { ViewRegion } from '@/shared/ui/view-region';

/** The newest PRs a repo lists on the home page; the rest are one link away in the ledger. */
const PRS_PER_REPO = 3;

// Text sits a step right of the repo name: 68px on a phone, 74px from md (the tree's node ends
// at 60 / 66px). `RepoRow` sets the tree's variables and draws the trunk from the avatar down.
const ROW = 'py-2 pl-[68px] pr-4 md:pl-[74px] md:pr-5';

export interface RepoPullRequestsLabels {
  merged: string;
  view: string;
  /** "+11 more pull requests". */
  more: (count: number) => string;
}

/**
 * A repo's newest merged PRs, Details view only: the repo's tree. Each PR hangs off the trunk on
 * a rounded branch that ends in its merged node. A repo with more PRs ends in a dashed branch to
 * the ledger link, a row as tall as the others.
 */
export function RepoPullRequests({
  repo,
  index,
  labels,
  formatDate,
}: {
  repo: OpenSourceRepo;
  index: number;
  labels: RepoPullRequestsLabels;
  formatDate: (iso: string) => string;
}) {
  const shown = repo.pullRequests.slice(0, PRS_PER_REPO);
  const hidden = repo.prCount - shown.length;
  const delay = (row: number) => index * 50 + 80 + row * 40;

  return (
    <ViewRegion show="details" index={index}>
      <ul className="pb-1">
        {shown.map((pr, row) => (
          <TreeItem
            key={pr.url}
            tone="merged"
            delay={delay(row)}
            through={row < shown.length - 1 || hidden > 0}
            className={ROW}
          >
            <GitPullRequest
              role="img"
              aria-label={labels.merged}
              className={cn(TREE_NODE, 'text-merged')}
            />

            <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:gap-4">
              <p className="line-clamp-2 min-w-0 flex-1 text-sm font-medium leading-snug md:line-clamp-1">
                {pr.title}{' '}
                <span className="whitespace-nowrap font-normal tabular-nums text-muted-foreground">
                  #{pr.number}
                </span>
              </p>

              {/* A phone has 227px here: date and diffstat, then `View` on a second line when they
                  do not fit together; `ml-auto` keeps it on the right edge either way. */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground md:shrink-0 md:flex-nowrap md:text-[13px]">
                <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
                  <time dateTime={pr.mergedAt} className="whitespace-nowrap">
                    {formatDate(pr.mergedAt)}
                  </time>
                  <Diffstat
                    additions={pr.additions}
                    deletions={pr.deletions}
                  />
                </span>
                <PullRequestLink
                  href={pr.url}
                  label={labels.view}
                  className="ml-auto md:ml-0"
                />
              </div>
            </div>
          </TreeItem>
        ))}

        {hidden > 0 && (
          // 36px, the height `min-h-9` fixes, puts the branch's line at the row's middle (18px):
          // the link and the ellipsis are centred on it, which a padded row put 1-2px low.
          <TreeItem
            tone="merged"
            dashed
            delay={delay(shown.length)}
            className="flex min-h-9 items-center pl-[68px] pr-4 md:pl-[74px] md:pr-5"
          >
            <Ellipsis
              aria-hidden
              className={cn(TREE_NODE, 'text-muted-foreground')}
            />
            <Link
              href={openSourceHref(repo.nameWithOwner)}
              className="relative inline-flex items-center gap-1.5 rounded-sm text-[13px] leading-5 text-primary underline underline-offset-4 before:absolute before:-inset-y-3.5 before:inset-x-0 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {labels.more(hidden)}
              <ArrowRight aria-hidden className="size-3.5" />
            </Link>
          </TreeItem>
        )}
      </ul>
    </ViewRegion>
  );
}
