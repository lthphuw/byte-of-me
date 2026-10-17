/**
 * Defends the server-prefetch seam: a first page cached under the entity's page key renders with no
 * round trip, and a save stales the list root. A key mismatch falls back to a client fetch behind
 * skeletons without throwing, so keys are asserted by seeding the cache, never by reading source.
 */
import type { ReactNode } from 'react';
import type { PaginatedData } from '@byte-of-me/api-core';
import { makeQueryClient } from '@byte-of-me/query';
import type { QueryClient } from '@tanstack/react-query';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import {
  afterAll,
  afterEach,
  describe,
  expect,
  it,
  mock,
  spyOn,
} from 'bun:test';
import { NextIntlClientProvider } from 'next-intl';
import { toast } from 'sonner';

// The catalogue lives outside `src/`, so the `@/` alias cannot reach it.
// eslint-disable-next-line import-alias/import-alias
import en from '../../../messages/en.json';

import {
  type CrudKeys,
  type CrudSaveOptions,
  useCrudManager,
} from './use-crud-manager';

type Item = { id: string };

const root = ['thing', 'admin-list'] as const;
const meta = { currentPage: 1, totalPages: 1, totalCount: 1, hasMore: false };
const seeded: PaginatedData<Item> = { data: [{ id: 'seeded' }], meta };
const keys: CrudKeys = { all: root, detail: (id) => [...root, 'detail', id] };

const spyToastSuccess = spyOn(toast, 'success').mockImplementation(() => 1);
const spyToastError = spyOn(toast, 'error').mockImplementation(() => 1);

type Overrides = {
  pageKey?: (page: number) => readonly unknown[];
  fetchPage?: (
    page: number,
    limit: number
  ) => Promise<{ success: true; data: PaginatedData<Item> }>;
  create?: () => Promise<
    { success: true; data: null } | { success: false; errorMsg: string }
  >;
  remove?: () => Promise<{ success: true; data: null }>;
};

function setup(queryClient: QueryClient, overrides: Overrides = {}) {
  const fetchPage =
    overrides.fetchPage ??
    mock(async () => ({
      success: true as const,
      data: { data: [{ id: 'fetched' }], meta },
    }));
  const create =
    overrides.create ??
    mock(async () => ({ success: true as const, data: null }));
  const remove = overrides.remove ?? create;

  const hook = renderHook(
    () =>
      useCrudManager<Item, { name: string }>({
        entity: 'Thing',
        keys,
        fetchPage,
        pageKey: overrides.pageKey ?? ((page) => [...root, page]),
        create,
        update: create,
        remove,
      }),
    {
      wrapper: ({ children }: { children: ReactNode }) => (
        <NextIntlClientProvider locale="en" messages={en}>
          <QueryClientProvider client={queryClient}>
            {children}
          </QueryClientProvider>
        </NextIntlClientProvider>
      ),
    }
  );

  return { ...hook, fetchPage, create, remove };
}

afterEach(() => {
  cleanup();
  spyToastSuccess.mockClear();
  spyToastError.mockClear();
});

afterAll(() => {
  spyToastSuccess.mockRestore();
  spyToastError.mockRestore();
});

describe('useCrudManager page key', () => {
  it('serves page 1 from a cache entry seeded under [root, 1] without fetching', () => {
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

  it('runs onSaved once the save succeeds', async () => {
    const onSaved = mock(() => {});
    const { result } = setup(makeQueryClient());

    act(() => result.current.openCreateDialog());
    act(() => result.current.save({ name: 'new' }, { onSaved }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
  });

  it('does not run onSaved when the save is refused', async () => {
    const create = mock(async () => ({
      success: false as const,
      errorMsg: 'Session expired',
    }));
    const onSaved = mock(() => {});
    const { result } = setup(makeQueryClient(), { create });
    const consoleSpy = spyOn(console, 'error').mockImplementation(() => {});

    act(() => result.current.openCreateDialog());
    act(() => result.current.save({ name: 'new' }, { onSaved }));

    await waitFor(() => expect(spyToastError).toHaveBeenCalled());
    expect(onSaved).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('saves when a form hands over its submit event as the second argument', async () => {
    const { result, create } = setup(makeQueryClient());

    act(() => result.current.openCreateDialog());
    // react-hook-form's handleSubmit calls the save it was given with (data, event).
    act(() =>
      result.current.save(
        { name: 'new' },
        new Event('submit') as unknown as CrudSaveOptions
      )
    );

    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(spyToastSuccess).toHaveBeenCalledWith('Thing created')
    );
  });
});

describe('useCrudManager toasts and deletes', () => {
  it('shows the created toast with the entity name', async () => {
    const { result } = setup(makeQueryClient());

    act(() => result.current.openCreateDialog());
    act(() => result.current.save({ name: 'new' }));

    await waitFor(() =>
      expect(spyToastSuccess).toHaveBeenCalledWith('Thing created')
    );
  });

  it('keeps the dialog open and shows the error toast on failure', async () => {
    const create = mock(async () => ({
      success: false as const,
      errorMsg: 'Session expired',
    }));
    const { result } = setup(makeQueryClient(), { create });
    const consoleSpy = spyOn(console, 'error').mockImplementation(() => {});

    act(() => result.current.openCreateDialog());
    act(() => result.current.save({ name: 'new' }));

    await waitFor(() =>
      expect(spyToastError).toHaveBeenCalledWith("Couldn't save Thing")
    );
    expect(result.current.isDialogOpen).toBe(true);
    consoleSpy.mockRestore();
  });

  it('invalidates the entity root key after a delete', async () => {
    const queryClient = makeQueryClient();
    const nested = [...root, 'options', 'en'];
    queryClient.setQueryData(nested, [{ id: 'option' }]);
    const { result, remove } = setup(queryClient);

    act(() => result.current.requestDelete({ id: 'row-1' }));
    act(() => result.current.confirmDelete());

    await waitFor(() => expect(remove).toHaveBeenCalledWith('row-1'));
    await waitFor(() =>
      expect(queryClient.getQueryState(nested)?.isInvalidated).toBe(true)
    );
  });

  it('clamps the page after the last row is deleted', async () => {
    let rowsOnLastPage: Item[] = [{ id: 'last' }];
    let totalPages = 2;
    const fetchPage = mock(async (page: number) => ({
      success: true as const,
      data: {
        data: page === 1 ? [{ id: 'first' }] : rowsOnLastPage,
        meta: { ...meta, currentPage: page, totalPages },
      },
    }));
    const remove = mock(async () => {
      rowsOnLastPage = [];
      totalPages = 1;
      return { success: true as const, data: null };
    });
    const { result } = setup(makeQueryClient(), {
      fetchPage,
      remove,
    });

    act(() => result.current.setPage(2));
    await waitFor(() => expect(result.current.items).toEqual([{ id: 'last' }]));

    act(() => result.current.requestDelete({ id: 'last' }));
    act(() => result.current.confirmDelete());

    await waitFor(() => expect(result.current.page).toBe(1));
    await waitFor(() =>
      expect(result.current.items).toEqual([{ id: 'first' }])
    );
  });
});
