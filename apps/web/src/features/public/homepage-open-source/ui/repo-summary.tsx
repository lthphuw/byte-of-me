import type { OpenSourceRepo } from '@byte-of-me/github';
import { Star } from 'lucide-react';
import Image from 'next/image';

import { ViewInline, ViewRegion } from './view-region';

import { Diffstat } from '@/entities/open-source/ui/diffstat';

const starFormat = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

export interface RepoSummaryLabels {
  /** "14 PRs": the feature owns the wording, `RepoSummary` must not pick a namespace. */
  prCount: (count: number) => string;
}

/**
 * The repo line of the home list: owner avatar, `owner/repo`, then the numbers. Compact adds the
 * description, language and stars; Details keeps two lines, since by then the reader has seen
 * them. It is content only: `RepoRow` decides what sits beside it.
 */
export function RepoSummary({
  repo,
  labels,
}: {
  repo: OpenSourceRepo;
  labels: RepoSummaryLabels;
}) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      <Image
        src={repo.avatarUrl}
        alt=""
        width={28}
        height={28}
        className="mt-0.5 h-7 w-7 shrink-0 rounded-md"
      />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold md:text-base">
          {repo.nameWithOwner}
        </p>

        {repo.description && (
          <ViewRegion show="compact">
            <p className="line-clamp-1 pt-0.5 text-xs text-muted-foreground md:text-sm">
              {repo.description}
            </p>
          </ViewRegion>
        )}

        <div className="mt-1 flex flex-wrap items-center gap-y-1 text-xs text-muted-foreground">
          <ViewInline>
            {repo.language && (
              <span className="mr-4 inline-flex items-center gap-1.5">
                <span
                  aria-hidden
                  className="h-2.5 w-2.5 rounded-full border border-border"
                  style={{
                    backgroundColor: repo.language.color ?? undefined,
                  }}
                />
                {repo.language.name}
              </span>
            )}

            <span className="mr-4 inline-flex items-center gap-1 tabular-nums">
              <Star aria-hidden className="h-3.5 w-3.5" />
              {starFormat.format(repo.stars)}
            </span>
          </ViewInline>

          <span className="mr-4 tabular-nums">
            {labels.prCount(repo.prCount)}
          </span>

          <Diffstat additions={repo.additions} deletions={repo.deletions} />
        </div>
      </div>
    </div>
  );
}
