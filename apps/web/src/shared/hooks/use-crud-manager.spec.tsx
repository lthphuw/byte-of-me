/**
 * What this defends is the seam the dashboard's server prefetch relies on: a
 * first page already sitting in the cache under the entity's page key is what
 * the manager renders, with no round trip, and a save marks everything under
 * the list root stale. A key mismatch here does not throw — the page just
 * falls through to a client fetch behind skeletons — so the keys are asserted
 * by seeding the cache, never by reading the hook's source.
 */
import type { ReactNode } from 'react';
import type { QueryClient } from '@tanstack/react-query';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, mock, spyOn } from 'bun:test';
import { toast } from 'sonner';

import { useCrudManager } from './use-crud-manager';

import { makeQueryClient } from '@/shared/lib/query/get-query-client';
import type { PaginatedData } from '@/shared/types/api/paginated-api.type';

type Item = { id: string };

const root = ['thing', 'admin-list'] as const;
const meta = { currentPage: 1, totalPages: 1, totalCount: 1, hasMore: false };
const seeded: PaginatedData<Item> = { data: [{ id: 'seeded' }], meta };

const spyToastSuccess = spyOn(toast, 'success').mockImplementation(() => 1);

function setup(
  queryClient: QueryClient,
  overrides: { pageKey?: (page: number) => readonly unknown[] } = {}
) {
  const fetchPage = mock(async () => ({
    success: true as const,
    data: { data: [{ id: 'fetched' }], meta },
  }));
  const create = mock(async () => ({ success: true as const, data: null }));

  const hook = renderHook(
    () =>
      useCrudManager<Item, { name: string }>({
        queryKey: root,
        entityLabel: 'Thing',
        fetchPage,
        create,
        update: create,
        remove: create,
        ...overrides,
      }),
    {
      wrapper: ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      ),
    }
  );

  return { ...hook, fetchPage, create };
}

afterEach(() => {
  cleanup();
  spyToastSuccess.mockClear();
});

describe('useCrudManager page key', () => {
  it('serves page 1 from a cache entry seeded under [queryKey, 1] without fetching', () => {
    const queryClient = makeQueryClient();
    queryClient.setQueryData([...root, 1], seeded);

    const { result, fetchPage } = setup(queryClient);

    expect(result.current.items).toEqual([{ id: 'seeded' }]);
    expect(result.current.isLoading).toBe(false);
    expect(fetchPage).not.toHaveBeenCalled();
  });

  it('serves page 1 from the entry under pageKey(1) when one is given', () => {
    const queryClient = makeQueryClient();
    queryClient.setQueryData(['custom-page', 1], seeded);

    const { result, fetchPage } = setup(queryClient, {
      pageKey: (page) => ['custom-page', page],
    });

    expect(result.current.items).toEqual([{ id: 'seeded' }]);
    expect(fetchPage).not.toHaveBeenCalled();
  });

  it('fetches the first page when nothing was seeded', async () => {
    const { result, fetchPage } = setup(makeQueryClient());

    await waitFor(() =>
      expect(result.current.items).toEqual([{ id: 'fetched' }])
    );
    expect(fetchPage).toHaveBeenCalledWith(1, 12);
  });
});

describe('useCrudManager save', () => {
  it('marks every entry under the list root stale, not just the open page', async () => {
    const queryClient = makeQueryClient();
    const nested = [...root, 'options', 'en'];
    queryClient.setQueryData([...root, 1], seeded);
    queryClient.setQueryData(nested, [{ id: 'option' }]);
    queryClient.setQueryData(['thing', 'public-list'], []);

    const { result, create } = setup(queryClient);

    act(() => result.current.save({ name: 'new' }));
    await waitFor(() => expect(create).toHaveBeenCalled());
    await waitFor(() =>
      expect(queryClient.getQueryState(nested)?.isInvalidated).toBe(true)
    );

    expect(
      queryClient.getQueryState(['thing', 'public-list'])?.isInvalidated
    ).toBe(false);
  });
});
