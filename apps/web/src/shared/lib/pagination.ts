import type {
  PaginatedMetadata,
  PaginatedParams,
} from '@/shared/types/api/paginated-api.type';

/**
 * Ceiling on `page`. The bound used to be `Number.MAX_SAFE_INTEGER`, so
 * `?page=1e999` reached Prisma as `skip: 5.4e16`; Prisma rejects that (`skip`
 * is an Int), which turned a bogus URL into a logged action error behind an
 * empty state. No list here is remotely this long, so any page past the bound
 * is empty either way — clamping just makes it a normal empty page.
 * `MAX_PAGE * maxLimit` stays inside Int32.
 */
export const MAX_PAGE = 100_000;

/**
 * Server actions are public HTTP endpoints: page/limit arrive
 * caller-controlled and must be bounded before they reach a query
 * (`limit: 1_000_000` would otherwise pull the whole table).
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
