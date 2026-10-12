import { queryOptions } from '@tanstack/react-query';

import { getPaginatedMedia } from '@/entities/media/api/get-paginated-media';
import { mediaKeys } from '@/entities/media/model/query-keys';
import { unwrapApiResponse } from '@/shared/lib/query/unwrap-api-response';

/** Rows per page, in the library grid and in both pickers. */
export const MEDIA_PAGE_SIZE = 12;

export const mediaQueries = {
  /** One page of the library grid. A refused read throws, so `isError` is set. */
  library: (page: number) =>
    queryOptions({
      queryKey: mediaKeys.library(page),
      queryFn: async () =>
        unwrapApiResponse(
          await getPaginatedMedia({ page, limit: MEDIA_PAGE_SIZE })
        ),
    }),
  /** Options for `useInfiniteListQuery`, which unwraps each page. */
  infinite: (limit: number) => ({
    queryKey: mediaKeys.infinite(limit),
    fetchPage: (page: number) => getPaginatedMedia({ page, limit }),
  }),
};
