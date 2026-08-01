import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'bun:test';

import { useUrlSyncedSearch } from './use-url-synced-search';

import type { FilterHistoryMode } from '@/shared/lib/filter-params';

/** Short enough to keep the suite fast, long enough to still be a debounce. */
const DELAY = 5;

interface Commit {
  search: string;
  history: FilterHistoryMode;
}

function setup(urlSearch = '') {
  const commits: Commit[] = [];

  const view = renderHook(
    (props: { urlSearch: string }) =>
      useUrlSyncedSearch({
        urlSearch: props.urlSearch,
        delay: DELAY,
        onCommit: (search, history) => commits.push({ search, history }),
      }),
    { initialProps: { urlSearch } }
  );

  return { ...view, commits };
}

/** Lets the debounce fire (or prove that it does not) inside `act`. */
async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, DELAY * 8));
  });
}

describe('useUrlSyncedSearch', () => {
  it('seeds the box from the URL and writes nothing on mount', async () => {
    const { result, commits } = setup('react');

    expect(result.current.search).toBe('react');

    await settle();

    // An unguarded mount write would go through `updateFilters`, which resets
    // the page — that is how `?tags=react&page=3` used to lose its page.
    expect(commits).toEqual([]);
  });

  it('pushes the first search, then replaces while refining it', async () => {
    const { result, commits } = setup('');

    act(() => result.current.setSearch('rea'));
    await settle();

    expect(commits).toEqual([{ search: 'rea', history: 'push' }]);

    act(() => result.current.setSearch('reacts'));
    await settle();

    expect(commits[1]).toEqual({ search: 'reacts', history: 'replace' });
  });

  it('pushes the clear back to an empty term', async () => {
    const { result, commits } = setup('react');

    act(() => result.current.setSearch(''));
    await settle();

    expect(commits).toEqual([{ search: '', history: 'push' }]);
  });

  it('keeps a keystroke typed while its own write is in flight', async () => {
    const { result, rerender, commits } = setup('');

    // t+0 type `rea`, t+debounce the write goes out.
    act(() => result.current.setSearch('rea'));
    await settle();
    expect(commits).toEqual([{ search: 'rea', history: 'push' }]);

    // t+ε the user types `c` — the router transition has not committed yet.
    act(() => result.current.setSearch('reac'));

    // …and now it commits, so the URL echoes the term we ourselves wrote.
    rerender({ urlSearch: 'rea' });

    // The echo must not revert the box: the `c` is still there.
    expect(result.current.search).toBe('reac');

    await settle();
    expect(commits[1]).toEqual({ search: 'reac', history: 'replace' });
  });

  it('re-syncs on a back navigation and does not write it back out', async () => {
    const { result, rerender, commits } = setup('');

    act(() => result.current.setSearch('rea'));
    await settle();
    rerender({ urlSearch: 'rea' });
    expect(result.current.search).toBe('rea');

    // Back to the unfiltered list.
    rerender({ urlSearch: '' });
    expect(result.current.search).toBe('');

    await settle();
    expect(commits).toHaveLength(1);

    // Forward again.
    rerender({ urlSearch: 'rea' });
    expect(result.current.search).toBe('rea');

    await settle();
    expect(commits).toHaveLength(1);
  });

  it('adopts a term arriving from an in-app ?q= link', async () => {
    const { result, rerender, commits } = setup('');

    rerender({ urlSearch: 'hydration' });

    expect(result.current.search).toBe('hydration');

    await settle();
    expect(commits).toEqual([]);
  });

  it('stays quiet after a filter reset that writes the URL itself', async () => {
    const { result, rerender, commits } = setup('react');

    act(() => result.current.resetSearch());
    expect(result.current.search).toBe('');

    await settle();
    // The reset caller already navigated; a second write would double the
    // history entry.
    expect(commits).toEqual([]);

    rerender({ urlSearch: '' });
    await settle();
    expect(commits).toEqual([]);
  });

  it('keeps a keystroke typed between a reset and its navigation', async () => {
    const { result, rerender } = setup('react');

    act(() => result.current.resetSearch());
    act(() => result.current.setSearch('b'));

    rerender({ urlSearch: '' });

    expect(result.current.search).toBe('b');
  });
});
