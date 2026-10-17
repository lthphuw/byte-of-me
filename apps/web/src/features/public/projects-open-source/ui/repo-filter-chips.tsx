'use client';

import type { ReactNode } from 'react';
import type { OpenSourceRepo } from '@byte-of-me/github';
import { Badge } from '@byte-of-me/ui';

interface RepoFilterChipsProps {
  repos: Pick<OpenSourceRepo, 'nameWithOwner' | 'prCount'>[];
  /** `owner/name`, or `null` for every repo. */
  value: string | null;
  onChange: (repo: string | null) => void;
  allLabel: string;
  groupLabel: string;
}

/** The repo filter on `/projects`: one chip is pressed at a time, "all" when none is a repo. */
export function RepoFilterChips({
  repos,
  value,
  onChange,
  allLabel,
  groupLabel,
}: RepoFilterChipsProps) {
  return (
    <div role="group" aria-label={groupLabel} className="flex flex-wrap gap-x-2 gap-y-3">
      <RepoChip active={value === null} onClick={() => onChange(null)}>
        {allLabel}
      </RepoChip>
      {repos.map((repo) => (
        <RepoChip
          key={repo.nameWithOwner}
          active={value === repo.nameWithOwner}
          onClick={() => onChange(repo.nameWithOwner)}
        >
          {repo.nameWithOwner} · {repo.prCount}
        </RepoChip>
      ))}
    </div>
  );
}

/**
 * Same pair as the tag chips: filled when pressed, `secondary` when not. `before:` is the
 * 44px touch floor as a hit area around the 28px chip, so it adds no height; a long name
 * wraps, it never widens the page.
 */
function RepoChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Badge
      asChild
      variant={active ? 'default' : 'secondary'}
      className="relative max-w-full px-3 py-1.5 text-left [overflow-wrap:anywhere] before:absolute before:-inset-y-2 before:inset-x-0"
    >
      <button type="button" aria-pressed={active} onClick={onClick}>
        {children}
      </button>
    </Badge>
  );
}
