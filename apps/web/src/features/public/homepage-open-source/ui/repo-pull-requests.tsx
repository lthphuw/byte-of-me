import type { CSSProperties } from 'react';
import type { OpenSourceRepo } from '@byte-of-me/github';
import { ArrowRight, Ellipsis, GitPullRequest } from 'lucide-react';

import { ViewRegion } from './view-region';

import { openSourceHref } from '@/entities/open-source/model/open-source-url';
import { Diffstat } from '@/entities/open-source/ui/diffstat';
import { PullRequestLink } from '@/entities/open-source/ui/pull-request-link';
import { Link } from '@/shared/i18n/navigation';
import { cn } from '@/shared/lib/utils';

/** The newest PRs a repo lists on the home page; the rest are one link away in the ledger. */
const PRS_PER_REPO = 3;

// The tree, phone / from md: trunk on the avatar's axis (30 / 34px), a rounded branch (14 / 16px)
// into a 16px node, text 8px on. `RepoRow` draws the trunk from the avatar down to the first row.
// Lines are `muted-foreground/45`: `--border` (1.5:1) made the branches read as disconnected.
const ROW = 'relative py-2 pl-[68px] pr-4 md:pl-[74px] md:pr-5';
const TRUNK =
  'before:absolute before:bottom-0 before:left-[30px] before:top-[18px] before:w-px before:bg-muted-foreground/45 md:before:left-[34px] md:before:top-1/2';
const BRANCH =
  'after:absolute after:left-[30px] after:top-0 after:h-[18px] after:w-[14px] after:rounded-bl-[10px] after:border-b after:border-l after:border-muted-foreground/45 after:transition-colors after:duration-150 md:after:left-[34px] md:after:h-1/2 md:after:w-4 hover:after:border-primary';
// The branch to "+N more" is dashed: the repo goes on past what the list shows.
const MORE_BRANCH =
  'after:absolute after:left-[30px] after:top-0 after:h-[15px] after:w-[14px] after:rounded-bl-[10px] after:border-b after:border-l after:border-dashed after:border-muted-foreground/45 md:after:left-[34px] md:after:w-4';
// A row fades in on its own `--tree-delay`, so the tree grows down as the list opens.
const GROW =
  'opacity-0 transition-opacity duration-200 ease-exit group-data-[view=details]/os:opacity-100 group-data-[view=details]/os:duration-250 group-data-[view=details]/os:ease-enter group-data-[view=details]/os:[transition-delay:var(--tree-delay)]';

export interface RepoPullRequestsLabels {
  merged: string;
  view: string;
  /** "+11 more pull requests". */
  more: (count: number) => string;
}

/**
 * A repo's newest merged PRs, Details view only: the repo's tree. Each PR hangs off the trunk on
 * a rounded branch that ends in its merged node, and the text sits a step right of the repo name.
 * A hover lights the branch; a repo with more PRs ends in a dashed branch to the ledger link.
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
  const delay = (row: number) =>
    ({ '--tree-delay': `${index * 50 + 80 + row * 40}ms` }) as CSSProperties;

  return (
    <ViewRegion show="details" index={index}>
      <ul className={cn(hidden === 0 && 'pb-1')}>
        {shown.map((pr, row) => (
          <li
            key={pr.url}
            style={delay(row)}
            className={cn(
              ROW,
              BRANCH,
              (row < shown.length - 1 || hidden > 0) && TRUNK,
              GROW
            )}
          >
            <GitPullRequest
              role="img"
              aria-label={labels.merged}
              className="absolute left-[44px] top-2.5 size-4 text-merged md:left-[50px] md:top-1/2 md:-mt-2"
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
          </li>
        ))}
      </ul>

      {hidden > 0 && (
        <div
          style={delay(shown.length)}
          className={cn(
            'relative pb-3 pl-[68px] pr-4 pt-1 md:pl-[74px] md:pr-5',
            MORE_BRANCH,
            GROW
          )}
        >
          <Ellipsis
            aria-hidden
            className="absolute left-[44px] top-1.5 size-4 text-muted-foreground md:left-[50px]"
          />
          <Link
            href={openSourceHref(repo.nameWithOwner)}
            className="relative inline-flex items-center gap-1.5 rounded-sm text-[13px] text-primary underline underline-offset-4 before:absolute before:-inset-y-3.5 before:inset-x-0 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {labels.more(hidden)}
            <ArrowRight aria-hidden className="size-3.5" />
          </Link>
        </div>
      )}
    </ViewRegion>
  );
}
