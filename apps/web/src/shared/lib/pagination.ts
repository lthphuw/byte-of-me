import type {
  PaginatedMetadata,
  PaginatedParams,
} from '@/shared/types/api/paginated-api.type';

/**
 * Server actions are public HTTP endpoints: page/limit arrive
 * caller-controlled and must be bounded before they reach a query
 * (`limit: 1_000_000` would otherwise pull the whole table).
 */
export function clampPagination(
  params: PaginatedParams,
  { defaultLimit = 12, maxLimit = 50 } = {}
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
    page: toBounded(params.page, 1, Number.MAX_SAFE_INTEGER),
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
