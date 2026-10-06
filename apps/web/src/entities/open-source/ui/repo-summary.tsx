import { Star } from 'lucide-react';
import Image from 'next/image';

import { Diffstat } from './diffstat';

import type { OpenSourceRepo } from '@/entities/open-source/model/types';

const starFormat = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

export interface RepoSummaryLabels {
  /** "14 PRs": the feature owns the wording, an entity must not pick a namespace. */
  prCount: (count: number) => string;
}

/**
 * The repo line shared by the home list and the `/projects` accordion: owner
 * avatar, `owner/repo`, one-line description, then the numbers. It is content
 * only, the caller decides whether it sits in a link or a `<summary>`.
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
        className="mt-0.5 h-7 w-7 shrink-0 rounded-md border"
      />

      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="truncate text-sm font-semibold md:text-base">
          {repo.nameWithOwner}
        </p>

        {repo.description && (
          <p className="line-clamp-1 text-xs text-muted-foreground md:text-sm">
            {repo.description}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-0.5 text-xs text-muted-foreground">
          {repo.language && (
            <span className="inline-flex items-center gap-1.5">
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

          <span className="inline-flex items-center gap-1 tabular-nums">
            <Star aria-hidden className="h-3.5 w-3.5" />
            {starFormat.format(repo.stars)}
          </span>

          <span className="tabular-nums">{labels.prCount(repo.prCount)}</span>

          <Diffstat additions={repo.additions} deletions={repo.deletions} />
        </div>
      </div>
    </div>
  );
}
