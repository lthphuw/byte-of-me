import type { PaginatedMetadata, PaginatedParams } from './paginated-api.type';

/**
 * Ceiling on `page`: `?page=1e999` reached Prisma as `skip: 5.4e16`, which it
 * rejects (Int). Past it every page is empty; `MAX_PAGE * maxLimit` fits Int32.
 */
export const MAX_PAGE = 100_000;

/**
 * Deepest page a public list stores in the data cache: each page is another
 * entry and nearly all past the first few are empty, so deeper reads go live.
 */
export const MAX_CACHED_PAGE = 50;

/**
 * Server actions are public HTTP endpoints: bound caller-controlled page and
 * limit before a query (`limit: 1_000_000` would pull the whole table).
 */
export function clampPagination(
  params: PaginatedParams,
  { defaultLimit = 12, maxLimit = 50, maxPage = MAX_PAGE } = {}
): { page: number; limit: number } {
  const toBounded = (
    value: number | undefined,
    fallback: number,
    max: number
  ) => {
    if (typeof value !== 'number' || Number.isNaN(value)) return fallback;
    return Math.min(Math.max(1, Math.floor(value)), max);
  };

  return {
    page: toBounded(params.page, 1, maxPage),
    limit: toBounded(params.limit, defaultLimit, maxLimit),
  };
}

export function buildPaginatedMeta({
  page,
  limit,
  totalCount,
}: {
  page: number;
  limit: number;
  totalCount: number;
}): PaginatedMetadata {
  const totalPages = Math.ceil(totalCount / limit);

  return {
    currentPage: page,
    totalPages,
    totalCount,
    hasMore: page < totalPages,
  };
}
