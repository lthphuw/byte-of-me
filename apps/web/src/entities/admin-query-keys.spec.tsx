/**
 * The dashboard managers invalidate `adminList()` after every save or delete,
 * read their pages through `adminPage(n)`, and the project and tag pickers sit
 * under the same root as `options(locale)`. A key that drifted out from under
 * the root would be silently stale after a save, and one that drifted from the
 * server prefetch would hydrate nothing and leave skeletons on screen — so
 * both are checked through real TanStack behaviour, not the shape of arrays.
 */
import type { ReactNode } from 'react';
import type { QueryClient } from '@tanstack/react-query';
import {
  hydrate,
  QueryClient as Client,
  QueryClientProvider,
} from '@tanstack/react-query';
import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, mock } from 'bun:test';

import { blogKeys } from '@/entities/blog/model/query-keys';
import { projectKeys } from '@/entities/project/model/query-keys';
import { tagKeys } from '@/entities/tag/model/query-keys';
import { useCrudManager } from '@/shared/hooks/use-crud-manager';
import { makeQueryClient } from '@/shared/lib/query/get-query-client';
import { prefetchAdminPage } from '@/shared/lib/query/prefetch-admin-page';

type AdminKeys = {
  adminList: () => readonly unknown[];
  adminPage: (page: number) => readonly unknown[];
};

const entities: {
  name: string;
  keys: AdminKeys;
  /** The picker entry nested under the root, for entities that have one. */
  picker: readonly unknown[] | null;
  /** An entry of the same entity that must NOT go stale with the list. */
  outside: readonly unknown[];
}[] = [
  {
    name: 'blog',
    keys: blogKeys,
    picker: null,
    outside: blogKeys.detail('b1'),
  },
  {
    name: 'project',
    keys: projectKeys,
    picker: projectKeys.options('en'),
    outside: projectKeys.publicList(1, {
      tagSlugs: [],
      techStackSlugs: [],
      search: '',
    }),
  },
  {
    name: 'tag',
    keys: tagKeys,
    picker: tagKeys.options('vi'),
    outside: tagKeys.infinite(12),
  },
];

const meta = { currentPage: 1, totalPages: 1, totalCount: 1, hasMore: false };

afterEach(cleanup);

describe.each(entities)('$name admin keys', ({ keys, picker, outside }) => {
  it('goes stale with the list root: every page and the pickers, nothing else', () => {
    const queryClient = new Client();
    const seededKeys = [
      keys.adminPage(1),
      keys.adminPage(2),
      ...(picker ? [picker] : []),
    ];
    for (const key of [...seededKeys, outside]) {
      queryClient.setQueryData(key, []);
    }

    void queryClient.invalidateQueries({ queryKey: keys.adminList() });

    for (const key of seededKeys) {
      expect(queryClient.getQueryState(key)?.isInvalidated).toBe(true);
    }
    expect(queryClient.getQueryState(outside)?.isInvalidated).toBe(false);
  });

  // Both wirings are live: blogs pass `pageKey`, projects and tags rely on the
  // hook appending the page to `adminList()`.
  describe.each([
    ['the default page key', false],
    ['an explicit pageKey', true],
  ])('manager using %s', (_label, withPageKey) => {
    it('renders the server-prefetched first page without a client fetch', async () => {
      const fetchPage = mock(async () => ({
        success: true as const,
        data: { data: [{ id: 'row' }], meta },
      }));
      const noop = mock(async () => ({ success: true as const, data: null }));

      const state = await prefetchAdminPage(keys.adminPage, fetchPage);
      const queryClient: QueryClient = makeQueryClient();
      hydrate(queryClient, state);
      fetchPage.mockClear();

      const { result } = renderHook(
        () =>
          useCrudManager<{ id: string }, unknown>({
            queryKey: keys.adminList(),
            ...(withPageKey ? { pageKey: keys.adminPage } : {}),
            entityLabel: 'Row',
            fetchPage,
            create: noop,
            update: noop,
            remove: noop,
          }),
        {
          wrapper: ({ children }: { children: ReactNode }) => (
            <QueryClientProvider client={queryClient}>
              {children}
            </QueryClientProvider>
          ),
        }
      );

      expect(result.current.items).toEqual([{ id: 'row' }]);
      expect(result.current.isLoading).toBe(false);
      expect(fetchPage).not.toHaveBeenCalled();
    });
  });
});
