export type PaginatedMetadata = {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  hasMore: boolean;
};

export type PaginatedData<T= any> = {
  data: T[];
  meta: PaginatedMetadata;
};
