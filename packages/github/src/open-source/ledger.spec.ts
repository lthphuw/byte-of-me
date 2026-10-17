import { describe, expect, it } from 'bun:test';

import {
  filterLedger,
  groupLedgerByMonth,
  pageLedger,
  resolveLedgerRepo,
  toLedger,
} from './ledger';
import type { OpenSourcePullRequest, OpenSourceRepo } from './types';

function pr(
  number: number,
  title: string,
  mergedAt: string
): OpenSourcePullRequest {
  return {
    number,
    title,
    url: `https://github.com/x/pull/${number}`,
    mergedAt,
    additions: 1,
    deletions: 0,
  };
}

function repo(
  nameWithOwner: string,
  pullRequests: OpenSourcePullRequest[]
): OpenSourceRepo {
  return {
    nameWithOwner,
    url: `https://github.com/${nameWithOwner}`,
    description: null,
    stars: 0,
    language: null,
    avatarUrl: '',
    prCount: pullRequests.length,
    additions: 0,
    deletions: 0,
    pullRequests,
  };
}

const rfDetr = repo('roboflow/rf-detr', [
  pr(1612, 'Tie-robust parity tests', '2026-10-09T10:00:00Z'),
  pr(1561, 'Record checkpoint args', '2026-09-29T08:00:00Z'),
]);
const trackers = repo('roboflow/trackers', [
  pr(40, 'Add ByteTrack', '2026-10-01T12:00:00Z'),
]);

describe('toLedger', () => {
  it('lists every PR newest first and tags each with its repo', () => {
    const ledger = toLedger([rfDetr, trackers]);

    expect(ledger.map((item) => item.number)).toEqual([1612, 40, 1561]);
    expect(ledger[1]?.repo).toBe('roboflow/trackers');
  });
});

describe('filterLedger', () => {
  const ledger = toLedger([rfDetr, trackers]);

  it('returns everything for a blank query and no repo', () => {
    expect(filterLedger(ledger, { text: '  ', repo: null })).toHaveLength(3);
  });

  it('restricts to the chosen repo', () => {
    const items = filterLedger(ledger, {
      text: '',
      repo: 'roboflow/trackers',
    });

    expect(items.map((item) => item.number)).toEqual([40]);
  });

  it('matches the title ignoring case', () => {
    const items = filterLedger(ledger, { text: 'PARITY', repo: null });

    expect(items.map((item) => item.number)).toEqual([1612]);
  });

  it('matches the repo name', () => {
    const items = filterLedger(ledger, { text: 'trackers', repo: null });

    expect(items.map((item) => item.number)).toEqual([40]);
  });

  it('matches a PR number with or without the hash', () => {
    expect(
      filterLedger(ledger, { text: '#1561', repo: null }).map((i) => i.number)
    ).toEqual([1561]);
    expect(
      filterLedger(ledger, { text: '40', repo: null }).map((i) => i.number)
    ).toEqual([40]);
  });

  it('combines the repo and the text', () => {
    const items = filterLedger(ledger, {
      text: 'checkpoint',
      repo: 'roboflow/trackers',
    });

    expect(items).toEqual([]);
  });
});

describe('pageLedger', () => {
  const items = toLedger([rfDetr, trackers]);

  it('slices the requested page and reports whether another follows', () => {
    const page = pageLedger(items, 1, 2);

    expect(page.items.map((item) => item.number)).toEqual([1612, 40]);
    expect(page.pagination).toEqual({
      currentPage: 1,
      totalPages: 2,
      totalCount: 3,
      hasMore: true,
    });
  });

  it('clamps a page past the end to the last page', () => {
    const page = pageLedger(items, 9, 2);

    expect(page.pagination.currentPage).toBe(2);
    expect(page.items.map((item) => item.number)).toEqual([1561]);
    expect(page.pagination.hasMore).toBe(false);
  });

  it('reports one empty page for an empty list', () => {
    expect(pageLedger([], 1)).toEqual({
      items: [],
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalCount: 0,
        hasMore: false,
      },
    });
  });
});

describe('groupLedgerByMonth', () => {
  it('starts a new group whenever the UTC month changes', () => {
    const months = groupLedgerByMonth(toLedger([rfDetr, trackers]));

    expect(months.map((month) => month.key)).toEqual(['2026-10', '2026-09']);
    expect(months[0]?.items.map((item) => item.number)).toEqual([1612, 40]);
    expect(months[1]?.items.map((item) => item.number)).toEqual([1561]);
  });
});

describe('resolveLedgerRepo', () => {
  const repos = [rfDetr, trackers];

  it('keeps a repo that is in the list', () => {
    expect(resolveLedgerRepo(repos, 'roboflow/trackers')).toBe(
      'roboflow/trackers'
    );
  });

  it('falls back to every repo for a name that is not in the list', () => {
    expect(resolveLedgerRepo(repos, 'someone/else')).toBeNull();
    expect(resolveLedgerRepo(repos, '')).toBeNull();
  });

  it('treats a missing value as every repo', () => {
    expect(resolveLedgerRepo(repos, null)).toBeNull();
  });
});
