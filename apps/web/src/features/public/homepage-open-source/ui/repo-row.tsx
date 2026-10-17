import type { CSSProperties } from 'react';
import type { OpenSourceRepo } from '@byte-of-me/github';
import { Button } from '@byte-of-me/ui';
import { ArrowRight, ArrowUpRight } from 'lucide-react';

import {
  RepoPullRequests,
  type RepoPullRequestsLabels,
} from './repo-pull-requests';
import { RepoSummary, type RepoSummaryLabels } from './repo-summary';

import { openSourceHref } from '@/entities/open-source/model/open-source-url';
import { Link } from '@/shared/i18n/navigation';

export interface RepoRowLabels
  extends RepoSummaryLabels,
    RepoPullRequestsLabels {
  contributions: string;
  repository: string;
  opensInNewTab: string;
}

// Slim: 26px, not `Button` sm's 32px. The 44px touch floor is the invisible `before:` area, and
// `can-hover:min-h-0` clears the pointer-only floor `sm` also sets.
const SLIM_BUTTON =
  'relative h-[26px] min-h-0 gap-1.5 px-2.5 can-hover:min-h-0 before:absolute before:-inset-y-[9px] before:inset-x-0 [&_svg]:size-3.5';

// The tree's trunk from just under the avatar (28px, 14px down) to the PR list, Details only.
// The fade and the hover colour are two elements, so the colour keeps the 150ms every segment
// of the path uses and does not take the fade's 250ms.
const TRUNK_STUB =
  'pointer-events-none absolute bottom-0 left-[30px] top-[45px] w-px opacity-0 transition-opacity duration-200 ease-exit group-data-[view=details]/os:opacity-100 group-data-[view=details]/os:duration-250 group-data-[view=details]/os:ease-enter group-data-[view=details]/os:[transition-delay:var(--tree-delay)] md:left-[34px]';
const TRUNK_STUB_LINE =
  'block h-full w-px bg-muted-foreground/45 transition-colors duration-150 can-hover:group-has-[li:hover]/tree:bg-merged';

/**
 * A home-page repo: its summary, two buttons, then its newest PRs in Details. `Contributions`
 * opens the `/projects` ledger narrowed to this repo; `Repository` opens GitHub in a new tab.
 * Nothing else on the row links.
 */
export function RepoRow({
  repo,
  index,
  labels,
  formatDate,
}: {
  repo: OpenSourceRepo;
  /** Position in the list: staggers the open of the PR list. */
  index: number;
  labels: RepoRowLabels;
  formatDate: (iso: string) => string;
}) {
  return (
    <div className="group/tree">
      <div className="relative flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between md:gap-6 md:px-5">
        <span
          aria-hidden
          style={{ '--tree-delay': `${index * 50}ms` } as CSSProperties}
          className={TRUNK_STUB}
        >
          <span className={TRUNK_STUB_LINE} />
        </span>
        <div className="min-w-0 flex-1">
          <RepoSummary repo={repo} labels={labels} />
        </div>

        {/* `pl-10` is the 28px avatar plus its 12px gap: below `md` the buttons sit under the text. */}
        <div className="flex flex-wrap items-center gap-2 pl-10 md:shrink-0 md:flex-nowrap md:pl-0">
          <Button size="sm" className={SLIM_BUTTON} asChild>
            <Link href={openSourceHref(repo.nameWithOwner)}>
              {labels.contributions}
              <ArrowRight aria-hidden />
            </Link>
          </Button>
          <Button
            size="sm"
            variant="outline"
            className={SLIM_BUTTON}
            asChild
          >
            <a href={repo.url} target="_blank" rel="noopener noreferrer">
              {labels.repository}
              <ArrowUpRight aria-hidden />
              <span className="sr-only">{labels.opensInNewTab}</span>
            </a>
          </Button>
        </div>
      </div>

      <RepoPullRequests
        repo={repo}
        index={index}
        labels={labels}
        formatDate={formatDate}
      />
    </div>
  );
}
