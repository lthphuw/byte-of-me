/**
 * What this defends is the server-prefetch seam of the public filter chips. A
 * hydrated entry carries the time the server built it, so under the client's
 * 60s default every mount refetched it; `HYDRATED_LIST_BEHAVIOR` is what stops
 * that, and it must not cost the chips their load when nothing was hydrated.
 * Hydration is reproduced with `dehydrate`/`hydrate` and an aged
 * `dataUpdatedAt`, never by reading the hook's source.
 */
import type { ReactNode } from 'react';
import {
  dehydrate,
  hydrate,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, mock } from 'bun:test';

import {
  HYDRATED_LIST_BEHAVIOR,
  type InfiniteListQueryBehavior,
  useInfiniteListQuery,
} from './use-infinite-list-query';

import { makeQueryClient } from '@/shared/lib/query/get-query-client';
import type { PaginatedData } from '@/shared/types/api/paginated-api.type';

type Item = { id: string };

const key = ['thing', 'infinite', 8] as const;
const DAY = 24 * 60 * 60 * 1000;

function page(id: string, currentPage: number, hasMore: boolean) {
  const data: PaginatedData<Item> = {
    data: [{ id }],
    meta: { currentPage, totalPages: 2, totalCount: 2, hasMore },
  };
  return data;
}

/** A client holding what the browser has right after hydrating the page. */
function hydratedClient(age: number) {
  const server = new QueryClient();
  server.setQueryData(key, {
    pages: [page('from-html', 1, true)],
    pageParams: [1],
  });
  const state = dehydrate(server);
  for (const query of state.queries) {
    query.state.dataUpdatedAt = Date.now() - age;
  }

  const client = makeQueryClient();
  hydrate(client, state);
  return client;
}

function setup(client: QueryClient, behavior?: InfiniteListQueryBehavior) {
  const fetchPage = mock(async (n: number) => ({
    success: true as const,
    data: page(`fetched-${n}`, n, n < 2),
  }));

  const hook = renderHook(
    (props: { behavior?: InfiniteListQueryBehavior }) =>
      useInfiniteListQuery<Item>({
        queryKey: key,
        fetchPage,
        ...props.behavior,
      }),
    {
      initialProps: { behavior },
      wrapper: ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    }
  );

  return { ...hook, fetchPage };
}

afterEach(cleanup);

describe('useInfiniteListQuery', () => {
  it('does not refetch hydrated data on mount when told it is prefetched', async () => {
    const { result, fetchPage } = setup(
      hydratedClient(DAY),
      HYDRATED_LIST_BEHAVIOR
    );

    await act(async () => {});

    expect(fetchPage).not.toHaveBeenCalled();
    expect(result.current.data?.pages[0].data[0].id).toBe('from-html');
  });

  it('refetches day-old hydrated data under the client default staleness', async () => {
    const { fetchPage } = setup(hydratedClient(DAY));

    await waitFor(() => expect(fetchPage).toHaveBeenCalledTimes(1));
  });

  it('keeps the client default staleness when no behaviour is given', async () => {
    // An explicit `staleTime: undefined` would override the 60s default with
    // 0, so even a seconds-old hydrated entry would refetch.
    const { fetchPage } = setup(hydratedClient(5_000));

    await act(async () => {});

    expect(fetchPage).not.toHaveBeenCalled();
  });

  it('still loads page 1 when nothing was hydrated', async () => {
    const { result, fetchPage } = setup(
      makeQueryClient(),
      HYDRATED_LIST_BEHAVIOR
    );

    await waitFor(() =>
      expect(result.current.data?.pages[0].data[0].id).toBe('fetched-1')
    );
    expect(fetchPage).toHaveBeenCalledTimes(1);
    expect(fetchPage).toHaveBeenCalledWith(1);
  });

  it('still pages forward from a hydrated first page', async () => {
    const { result, fetchPage } = setup(
      hydratedClient(DAY),
      HYDRATED_LIST_BEHAVIOR
    );

    // Reading `data` first matters: the hook only re-renders for fields read.
    expect(result.current.data?.pages).toHaveLength(1);

    await act(async () => {
      await result.current.fetchNextPage();
    });

    expect(fetchPage).toHaveBeenCalledTimes(1);
    expect(fetchPage).toHaveBeenCalledWith(2);
    await waitFor(() => expect(result.current.data?.pages).toHaveLength(2));
  });

  it('holds its fetch until enabled', async () => {
    const { result, rerender, fetchPage } = setup(makeQueryClient(), {
      enabled: false,
    });

    await act(async () => {});
    expect(fetchPage).not.toHaveBeenCalled();
    expect(result.current.isPending).toBe(true);

    rerender({ behavior: { enabled: true } });

    await waitFor(() => expect(fetchPage).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(result.current.isPending).toBe(false));
  });
});
