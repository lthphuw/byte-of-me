import type { PaginatedMetadata } from '@/shared/types/api/paginated-api.type';

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
