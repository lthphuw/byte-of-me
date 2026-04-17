export type PaginatedMetadata = {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  hasMore: boolean;
};

export type PaginatedData<T = Any> = {
  data: T[];
  meta: PaginatedMetadata;
};

export type PaginatedParams = {
  page?: number;
  limit?: number;
};
