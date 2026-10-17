import type { OpenSourceRepo } from '@byte-of-me/github';
import { Button } from '@byte-of-me/ui';
import { ArrowRight, ArrowUpRight } from 'lucide-react';

import { openSourceHref } from '@/entities/open-source/model/open-source-url';
import {
  RepoSummary,
  type RepoSummaryLabels,
} from '@/entities/open-source/ui/repo-summary';
import { Link } from '@/shared/i18n/navigation';

export interface RepoRowLabels extends RepoSummaryLabels {
  contributions: string;
  repository: string;
  opensInNewTab: string;
}

/**
 * A home-page repo: its summary, then two buttons. `Contributions` opens the `/projects` ledger
 * narrowed to this repo; `Repository` opens GitHub in a new tab. Nothing else on the row links.
 */
export function RepoRow({
  repo,
  labels,
}: {
  repo: OpenSourceRepo;
  labels: RepoRowLabels;
}) {
  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between md:gap-6 md:px-5">
      <div className="min-w-0 flex-1">
        <RepoSummary repo={repo} labels={labels} />
      </div>

      {/* `pl-10` is the 28px avatar plus its 12px gap: below `md` the buttons sit under the text. */}
      <div className="flex flex-wrap items-center gap-2 pl-10 md:shrink-0 md:flex-nowrap md:pl-0">
        <Button size="sm" asChild>
          <Link href={openSourceHref(repo.nameWithOwner)}>
            {labels.contributions}
            <ArrowRight aria-hidden />
          </Link>
        </Button>
        <Button size="sm" variant="outline" asChild>
          <a href={repo.url} target="_blank" rel="noopener noreferrer">
            {labels.repository}
            <ArrowUpRight aria-hidden />
            <span className="sr-only">{labels.opensInNewTab}</span>
          </a>
        </Button>
      </div>
    </div>
  );
}
