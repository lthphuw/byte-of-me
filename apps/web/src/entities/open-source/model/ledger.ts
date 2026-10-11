import type {
  OpenSourceLedgerItem,
  OpenSourceRepo,
} from '@/entities/open-source/model/types';

export const LEDGER_PAGE_SIZE = 20;

/** Every merged PR across the repos, newest first, each tagged with its repo. */
export function toLedger(repos: OpenSourceRepo[]): OpenSourceLedgerItem[] {
  return repos
    .flatMap((repo) =>
      repo.pullRequests.map((pr) => ({ ...pr, repo: repo.nameWithOwner }))
    )
    .sort((a, b) => b.mergedAt.localeCompare(a.mergedAt));
}

export interface LedgerFilter {
  /** Matches the title, the repo name or the PR number (`#1612`). */
  text: string;
  /** `owner/name`, or `null` for every repo. */
  repo: string | null;
}

export function filterLedger(
  items: OpenSourceLedgerItem[],
  { text, repo }: LedgerFilter
): OpenSourceLedgerItem[] {
  const needle = text.trim().toLowerCase();
  const number = needle.replace(/^#/, '');

  return items.filter((item) => {
    if (repo !== null && item.repo !== repo) return false;
    if (needle === '') return true;

    return (
      item.title.toLowerCase().includes(needle) ||
      item.repo.toLowerCase().includes(needle) ||
      String(item.number) === number
    );
  });
}

export interface LedgerPage {
  items: OpenSourceLedgerItem[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    hasMore: boolean;
  };
}

/** One page of the list. A page past the end clamps to the last one. */
export function pageLedger(
  items: OpenSourceLedgerItem[],
  page: number,
  pageSize = LEDGER_PAGE_SIZE
): LedgerPage {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(Math.max(page, 1), totalPages);
  const start = (currentPage - 1) * pageSize;

  return {
    items: items.slice(start, start + pageSize),
    pagination: {
      currentPage,
      totalPages,
      totalCount: items.length,
      hasMore: currentPage < totalPages,
    },
  };
}

export interface LedgerMonth {
  /** `YYYY-MM` in UTC. Formatted for the heading in UTC too, so server and browser agree. */
  key: string;
  items: OpenSourceLedgerItem[];
}

/** Splits an already-sorted list into runs that merged in the same UTC month. */
export function groupLedgerByMonth(
  items: OpenSourceLedgerItem[]
): LedgerMonth[] {
  const months: LedgerMonth[] = [];

  for (const item of items) {
    const key = item.mergedAt.slice(0, 7);
    const last = months[months.length - 1];

    if (last?.key === key) {
      last.items.push(item);
    } else {
      months.push({ key, items: [item] });
    }
  }

  return months;
}
